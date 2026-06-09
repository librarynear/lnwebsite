'use server'

import prisma from "@/lib/prisma"
import { auth, currentUser } from "@clerk/nextjs/server"

export async function getSession() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  // Find user by clerk ID (authId)
  let user = await prisma.user.findUnique({ where: { authId: clerkId } });
  
  // Just-In-Time synchronization if user is missing in our DB!
  if (!user) {
    const clerkUser = await currentUser();
    if (!clerkUser) return null;
    
    // Find first email
    const primaryEmail = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress 
      || clerkUser.emailAddresses[0]?.emailAddress;

    if (!primaryEmail) return null;

    // We'll default to STUDENT if not specified. You can upgrade roles in a dashboard or based on clerk public metadata later.
    user = await prisma.user.upsert({
      where: { email: primaryEmail },
      create: {
        authId: clerkId,
        email: primaryEmail,
        name: clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : "New User",
        role: "STUDENT" 
      },
      update: {
        authId: clerkId
      }
    });
  }

  return { userId: user.id, role: user.role };
}
