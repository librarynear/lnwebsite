'use server'

import prisma from "@/lib/prisma"
import { getSession } from "./auth-actions"
import { revalidatePath } from "next/cache"
import { uploadImage } from "@/lib/imagekit"

export async function updateStudentProfile(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const dobStr = formData.get("dob") as string;
  const gender = formData.get("gender") as string;
  const address = formData.get("address") as string;
  const locality = formData.get("locality") as string;
  const qualification = formData.get("qualification") as string;
  const organization = formData.get("organization") as string;
  const profilePhotoFile = formData.get("profilePhotoFile") as File;

  let profilePhotoUrl: string | undefined = undefined;

  if (profilePhotoFile && profilePhotoFile.size > 0) {
    // Validate file size (max 2MB)
    if (profilePhotoFile.size > 2 * 1024 * 1024) {
      throw new Error("Profile photo must be less than 2MB");
    }
    
    // Validate file type
    if (!profilePhotoFile.type.startsWith('image/')) {
      throw new Error("Profile photo must be an image");
    }

    // Upload to ImageKit (CDN) instead of storing base64 in Postgres — keeps
    // the User row small and responses fast at scale.
    const buffer = Buffer.from(await profilePhotoFile.arrayBuffer());
    const mimeType = profilePhotoFile.type || 'image/jpeg';
    profilePhotoUrl = await uploadImage(
      buffer,
      `profile_${session.userId}_${Date.now()}`,
      '/profiles',
      mimeType,
    );
  }

  const currentUser = await prisma.user.findUnique({ where: { id: session.userId } });
  const isVerified = currentUser?.digilockerVerified;

  const email = formData.get("email") as string;

  try {
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        name: isVerified ? undefined : (name || undefined),
        email: email || undefined,
        phone: phone || null,
        dob: isVerified ? undefined : (dobStr ? new Date(dobStr) : null),
        gender: isVerified ? undefined : (gender || null),
        address: isVerified ? undefined : (address || null),
        locality: locality || null,
        qualification: qualification || null,
        organization: organization || null,
        ...(profilePhotoUrl && !isVerified && { profilePhotoUrl }),
      }
    });
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      throw new Error("Email address is already in use by another account.");
    }
    throw error;
  }

  revalidatePath("/student/profile");
  revalidatePath("/dashboard/students");
  return { success: true };
}

// Mock DigiLocker Flow
export async function verifyDigilocker() {
  // Mock endpoint — disabled in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Mock DigiLocker is disabled in production. Use the real KYC flow.');
  }

  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  // Mock DigiLocker payload
  const mockData = {
    name: "Aadhaar Verified User",
    dob: new Date("2000-01-15"),
    gender: "MALE",
    address: "Block A, Street 4, Sector 15, New Delhi",
    locality: "Sector 15",
    profilePhotoUrl: "https://i.pravatar.cc/300?img=11",
    digilockerVerified: true
  };

  await prisma.user.update({
    where: { id: session.userId },
    data: mockData
  });

  revalidatePath("/student/profile");
  revalidatePath("/dashboard/students");
  return { success: true, data: mockData };
}

export async function syncUpdatedPhone() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const { adminAuth } = await import("@/lib/firebase/firebaseAdmin");
  if (!adminAuth) throw new Error("Firebase Admin not initialized");

  const dbUser = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!dbUser || !dbUser.authId) throw new Error("Firebase account link not found");

  const firebaseUser = await adminAuth.getUser(dbUser.authId);
  const newPhone = firebaseUser.phoneNumber;

  if (!newPhone) {
    throw new Error("No phone number found in Firebase account");
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { phone: newPhone }
  });

  revalidatePath("/student/profile");
  return { success: true, phone: newPhone };
}
