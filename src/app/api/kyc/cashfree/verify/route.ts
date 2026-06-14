import { NextResponse } from 'next/server';
import { getSession } from '@/app/actions/auth-actions';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getCashfreeSignature, getCashfreeBaseUrl, isCashfreeSuccess } from '@/lib/cashfree';
import { uploadImage } from '@/lib/imagekit';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // The client may send a verification_id, but we NEVER trust it. The only
    // id we act on is the one we bound to THIS user at create-time. This blocks
    // submitting another user's id to import their Aadhaar identity.
    const { verification_id: clientId } = await req.json().catch(() => ({}));

    const pendingKey = `kyc:pending:${session.userId}`;
    const pendingRaw = await redis.get(pendingKey);
    const verification_id = typeof pendingRaw === 'string' ? pendingRaw : null;

    if (!verification_id) {
      return NextResponse.json(
        { error: 'No pending verification found. Please start KYC again.' },
        { status: 400 }
      );
    }

    // If the client supplied an id, it must match the one we issued.
    if (clientId && clientId !== verification_id) {
      return NextResponse.json({ error: 'Verification mismatch' }, { status: 400 });
    }

    const cfClientId = process.env.CASHFREE_VERIFICATION_CLIENT_ID;
    const cfClientSecret = process.env.CASHFREE_VERIFICATION_CLIENT_SECRET;

    if (!cfClientId || !cfClientSecret) {
      return NextResponse.json({ error: 'Cashfree credentials missing' }, { status: 500 });
    }

    const response = await fetch(
      `${getCashfreeBaseUrl()}/document/AADHAAR?verification_id=${encodeURIComponent(verification_id)}`,
      {
        method: 'GET',
        headers: {
          'x-client-id': cfClientId,
          'x-client-secret': cfClientSecret,
          ...(getCashfreeSignature(cfClientId) ? { 'x-cf-signature': getCashfreeSignature(cfClientId) as string } : {})
        },
      }
    );

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      // Do NOT log the raw body — it may contain Aadhaar PII.
      console.error('Cashfree Verify: non-JSON response, status', response.status);
      throw new Error('Cashfree returned an unexpected response');
    }

    if (!response.ok) {
      // `data.message` is a Cashfree status message, not user PII.
      throw new Error(data.message || 'Failed to verify Cashfree DigiLocker');
    }

    // Only accept a genuinely successful verification — never mark a user
    // verified on a PENDING/FAILED/partial result.
    if (!isCashfreeSuccess(data)) {
      return NextResponse.json(
        { error: 'Verification was not completed successfully.' },
        { status: 400 }
      );
    }

    // Parse Aadhaar data from Cashfree's flat response structure
    const aadhaarData = data.document || data.data || data.aadhaar || data.user || data;

    // Parse Address
    const splitAddr = aadhaarData.split_address || {};
    const addressParts = [
      splitAddr.house,
      splitAddr.street,
      splitAddr.landmark,
      splitAddr.vtc,
      splitAddr.dist,
      splitAddr.state,
      splitAddr.pincode
    ].filter(Boolean);
    const addressStr = addressParts.length > 0 ? addressParts.join(', ') : (aadhaarData.address || 'Verified Address');

    // Parse DOB safely (Cashfree usually returns DD-MM-YYYY)
    let parsedDob: Date | undefined = undefined;
    if (aadhaarData.dob && typeof aadhaarData.dob === 'string') {
      if (aadhaarData.dob.includes('-')) {
        const parts = aadhaarData.dob.split('-');
        if (parts[0].length === 2 && parts[2]?.length === 4) {
          parsedDob = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); // YYYY-MM-DD
        } else {
          parsedDob = new Date(aadhaarData.dob);
        }
      } else {
        parsedDob = new Date(aadhaarData.dob);
      }
      if (parsedDob && Number.isNaN(parsedDob.getTime())) parsedDob = undefined;
    }

    // Parse Photo — upload base64 to ImageKit instead of bloating the DB row.
    let profilePhotoUrl: string | undefined = undefined;
    if (aadhaarData.photo_link && typeof aadhaarData.photo_link === 'string') {
      if (aadhaarData.photo_link.startsWith('http')) {
        profilePhotoUrl = aadhaarData.photo_link;
      } else {
        try {
          profilePhotoUrl = await uploadImage(
            aadhaarData.photo_link,
            `kyc_${session.userId}_${Date.now()}`,
            '/kyc',
          );
        } catch {
          // Non-fatal: keep verification even if the photo upload fails.
          profilePhotoUrl = undefined;
        }
      }
    }

    const mappedData = {
      name: aadhaarData.name || 'Verified Student',
      dob: parsedDob,
      gender: aadhaarData.gender === 'M' ? 'MALE' : aadhaarData.gender === 'F' ? 'FEMALE' : 'OTHER',
      address: addressStr,
      ...(profilePhotoUrl && { profilePhotoUrl }),
      digilockerVerified: true
    };

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: mappedData
    });

    // Single-use: consume the pending verification so it cannot be replayed.
    await redis.del(pendingKey);

    return NextResponse.json({ success: true, user: updatedUser });

  } catch (error: any) {
    console.error('Cashfree Verify Error:', error?.message || 'unknown error');
    return NextResponse.json({ error: 'An error occurred during verification' }, { status: 500 });
  }
}
