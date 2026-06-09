'use server'

import prisma from "@/lib/prisma"
import { getSession } from "./auth-actions"
import { revalidatePath } from "next/cache"

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }
}

export async function approveLibrary(libraryId: string) {
  await requireAdmin();
  
  await prisma.library.update({
    where: { id: libraryId },
    data: { kycStatus: "APPROVED" }
  });
  
  revalidatePath('/admin');
  revalidatePath('/'); // Revalidate public feed
}

export async function rejectLibrary(libraryId: string) {
  await requireAdmin();
  
  await prisma.library.update({
    where: { id: libraryId },
    data: { kycStatus: "REJECTED" }
  });
  
  revalidatePath('/admin');
}

export async function updateLibraryDetails(libraryId: string, formData: FormData) {
  await requireAdmin();
  
  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const managerName = formData.get("managerName") as string;
  const managerPhone = formData.get("managerPhone") as string;
  
  if (!name || !address) throw new Error("Name and Address are required");

  await prisma.library.update({
    where: { id: libraryId },
    data: {
      name,
      address,
      managerName: managerName || null,
      managerPhone: managerPhone || null
    }
  });

  revalidatePath('/admin');
  revalidatePath(`/admin/edit/${libraryId}`);
}
