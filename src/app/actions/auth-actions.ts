'use server'

import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { adminAuth } from "@/lib/firebase/firebaseAdmin"
import { redis } from "@/lib/redis"

// Short TTL keeps per-request auth cheap while bounding role/profile staleness.
const SESSION_CACHE_TTL_SECONDS = 30
// Revoked sessions are remembered for the full cookie lifetime (14 days).
const REVOCATION_TTL_SECONDS = 60 * 60 * 24 * 14

type SessionData = { userId: string; role: string; email: string | null; phone: string | null; employerLibraryId: string | null }

async function generateFocusXId() {
  let id = "";
  let exists = true;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const yearStr = new Date().getFullYear().toString().slice(2, 4);

  while (exists) {
    let randomPart = '';
    for (let i = 0; i < 4; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    id = "FD-" + yearStr + randomPart;
    const user = await prisma.user.findUnique({ where: { uniqueId: id } });
    if (!user) exists = false;
  }
  return id;
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;

  if (!sessionCookie || !adminAuth) return null;

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
    const authId = decodedClaims.uid;

    try {
      if (await redis.get(`revoked:${authId}`)) return null;
    } catch {
      // Redis unavailable: fall through
    }

    const cacheKey = `usersess:${authId}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return (typeof cached === 'string' ? JSON.parse(cached) : cached) as SessionData;
      }
    } catch {
      // Ignore cache read errors
    }

    const user = await prisma.user.findUnique({ where: { authId } });
    if (!user) return null;

    const sessionData: SessionData = { 
      userId: user.id, 
      role: user.role, 
      email: user.email, 
      phone: user.phone,
      employerLibraryId: user.employerLibraryId
    };
    
    try {
      await redis.set(cacheKey, JSON.stringify(sessionData), { ex: SESSION_CACHE_TTL_SECONDS });
    } catch {
      // Cache write failures are non-fatal
    }
    return sessionData;
  } catch (error) {
    console.error("Session verification failed");
    return null;
  }
}

export async function getPostLoginRedirect(): Promise<string> {
  const session = await getSession();
  if (session && (session.role === 'LIBRARIAN' || session.role === 'ADMIN' || session.role === 'RECEPTIONIST')) {
    return '/dashboard';
  }
  return '/';
}

// NOTE: Since Firebase login is done on the client side, these old server actions 
// are no longer directly used for credentials, but we keep the logic here for 
// Prisma DB creation just in case, or we move it strictly to client side + JIT.
// The `login` and `signup` forms in the UI will need to be converted to client components.
export async function checkUserExists(phone: string) {
  try {
    const user = await prisma.user.findUnique({ where: { phone } });
    // Don't leak name — only return existence
    return { exists: !!user };
  } catch (e) {
    return { error: "Failed to check user." };
  }
}

export async function syncUserOnSignup(authId: string, phone: string, name?: string) {
  try {
    // Verify the authId is a real Firebase UID
    if (!adminAuth) return { error: 'Auth not initialized' };
    try {
      await adminAuth.getUser(authId);
    } catch {
      return { error: 'Invalid auth credentials' };
    }

    let user = await prisma.user.findUnique({ where: { phone } });
    if (user) {
      // Prevent account hijacking: don't overwrite an existing authId
      if (user.authId && user.authId !== authId) {
        return { error: 'This phone number is already registered with another account' };
      }
      await prisma.user.update({
        where: { id: user.id },
        data: name ? { authId, name } : { authId }
      });
      return { success: true, isNewUser: false };
    } else {
      if (!name) {
        return { success: true, isNewUser: true };
      }
      await prisma.user.create({
        data: {
          authId,
          phone,
          name,
          role: "STUDENT",
          uniqueId: await generateFocusXId()
        }
      });
      return { success: true, isNewUser: true };
    }
  } catch (e) {
    console.error("Failed to sync user to DB on signup:", e);
    return { error: "Failed to sync user." };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  
  // Revoke server-side: Firebase refresh tokens (defence in depth) + our own
  // Redis revocation set (which getSession actually checks per-request).
  if (sessionCookie && adminAuth) {
    try {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie);
      // Revoke Firebase refresh tokens (defence in depth)
      await adminAuth.revokeRefreshTokens(decoded.uid);

      // Redis revocation — retry once on failure since this is the primary
      // mechanism that blocks stolen cookies.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await redis.set(`revoked:${decoded.uid}`, '1', { ex: REVOCATION_TTL_SECONDS });
          await redis.del(`usersess:${decoded.uid}`);
          break;
        } catch (redisErr) {
          if (attempt === 1) {
            console.error('CRITICAL: Redis revocation failed after retry — stolen cookie may remain valid', redisErr);
          }
        }
      }
    } catch (e) {
      // Session cookie already invalid — nothing to revoke
    }
  }
  
  cookieStore.set('session', '', { maxAge: 0 });
  redirect('/login');
}
