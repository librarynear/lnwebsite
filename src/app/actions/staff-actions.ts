'use server'

import prisma from "@/lib/prisma"
import { getSession } from "./auth-actions"
import { revalidatePath } from "next/cache"
import { verifyFirebaseIdToken } from "@/lib/verify-firebase-token"

export async function addReceptionist(formData: FormData) {
  const session = await getSession();
  if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN')) {
    return { error: "Unauthorized" };
  }

  const library = await prisma.library.findFirst({
    where: session.role === 'ADMIN' ? {} : { librarianId: session.userId }
  });

  if (!library) return { error: "Library not found" };

  const phone = formData.get("phone") as string;
  const name = formData.get("name") as string;
  const idToken = formData.get("idToken") as string;

  if (!phone || !name || !idToken) return { error: "Phone, name, and OTP verification are required" };

  // Verify the OTP token really belongs to the phone being onboarded, so a
  // librarian can't bind an arbitrary Firebase UID (or someone else's) to a
  // RECEPTIONIST role.
  const verified = await verifyFirebaseIdToken(idToken, phone);
  if (!verified.ok) return { error: verified.error };
  const authId = verified.uid;

  try {
    // Check if user already exists by authId or phone
    let existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { authId: authId },
          { phone: phone }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.role === 'LIBRARIAN' || existingUser.role === 'ADMIN') {
        return { error: "Cannot assign this role to an existing Librarian or Admin" };
      }
      
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role: 'RECEPTIONIST',
          employerLibraryId: library.id,
          authId: authId, // Ensure it's updated if it was only matched by phone
          phone: phone, // Ensure phone is updated if only matched by authId
          name: name
        }
      });
    } else {
      // Create new staff user with verified authId
      await prisma.user.create({
        data: {
          name,
          phone,
          authId,
          role: 'RECEPTIONIST',
          employerLibraryId: library.id,
          uniqueId: "FD-" + Math.random().toString(36).substr(2, 6).toUpperCase()
        }
      });
    }

    revalidatePath("/dashboard/staff");
    return { success: true };
  } catch (err: any) {
    console.error("Add Receptionist Error:", err);
    return { error: "Database error: " + (err.message || "Failed to save staff.") };
  }
}

export async function removeReceptionist(userId: string) {
  const session = await getSession();
  if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN')) {
    return { error: "Unauthorized" };
  }

  const library = await prisma.library.findFirst({
    where: session.role === 'ADMIN' ? {} : { librarianId: session.userId }
  });

  if (!library) return { error: "Library not found" };

  try {
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser || targetUser.employerLibraryId !== library.id) {
      return { error: "User not found or not employed by this library" };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        role: 'STUDENT',
        employerLibraryId: null
      }
    });

    revalidatePath("/dashboard/staff");
    return { success: true };
  } catch (err: any) {
    console.error("Remove Receptionist Error:", err);
    return { error: "Database error: " + (err.message || "Failed to remove staff.") };
  }
}
