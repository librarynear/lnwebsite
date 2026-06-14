'use server'

import prisma from "@/lib/prisma"
import { getSession } from "./auth-actions"
import { revalidatePath } from "next/cache"
import { redis, deleteByPattern } from "@/lib/redis"
import { parseSafeUrl } from "@/lib/validation"

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }
}

async function clearLibraryCache(libraryId?: string) {
  try {
    // SCAN-based delete (non-blocking) instead of KEYS.
    await deleteByPattern('libraries:search:*');
    if (libraryId) {
      await redis.del(`library:${libraryId}`);
    }
  } catch (e) {
    console.error("Failed to clear redis cache:", e);
  }
}

export async function approveLibrary(libraryId: string) {
  await requireAdmin();
  
  const library = await prisma.library.findUnique({ where: { id: libraryId } });
  if (!library) throw new Error("Library not found");

  await prisma.library.update({
    where: { id: libraryId },
    data: { kycStatus: "APPROVED" }
  });

  // Promote the library owner to LIBRARIAN role
  if (library.librarianId) {
    await prisma.user.update({
      where: { id: library.librarianId },
      data: { role: 'LIBRARIAN' }
    });
  }
  
  await clearLibraryCache(libraryId);
  revalidatePath('/admin');
  revalidatePath('/'); // Revalidate public feed
}

export async function rejectLibrary(libraryId: string) {
  await requireAdmin();
  
  await prisma.library.update({
    where: { id: libraryId },
    data: { kycStatus: "REJECTED" }
  });
  
  await clearLibraryCache(libraryId);
  revalidatePath('/admin');
  revalidatePath('/');
}

export async function updateLibraryDetails(libraryId: string, formData: FormData) {
  await requireAdmin();
  
  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const managerName = formData.get("managerName") as string;
  const managerPhone = formData.get("managerPhone") as string;
  const city = formData.get("city") as string;
  const state = formData.get("state") as string;
  const locality = formData.get("locality") as string;
  const description = formData.get("description") as string;
  const openingTime = formData.get("openingTime") as string;
  const closingTime = formData.get("closingTime") as string;
  const facilitiesRaw = formData.get("facilities") as string;
  const googleMapsUrl = formData.get("googleMapsUrl") as string;
  const metroStation = formData.get("metroStation") as string;
  
  const seatsAvailableStr = formData.get("seatsAvailable") as string;
  const latitudeStr = formData.get("latitude") as string;
  const longitudeStr = formData.get("longitude") as string;
  const metroDistanceStr = formData.get("metroDistance") as string;

  if (!name || !address) throw new Error("Name and Address are required");

  const facilities = facilitiesRaw ? facilitiesRaw.split(",").map(f => f.trim()).filter(Boolean) : [];
  const safeGoogleMapsUrl = parseSafeUrl(googleMapsUrl, "Google Maps URL");

  await prisma.library.update({
    where: { id: libraryId },
    data: {
      name,
      address,
      managerName: managerName || null,
      managerPhone: managerPhone || null,
      city: city || null,
      state: state || null,
      locality: locality || null,
      description: description || null,
      openingTime: openingTime || null,
      closingTime: closingTime || null,
      facilities,
      googleMapsUrl: safeGoogleMapsUrl,
      metroStation: metroStation || null,
      seatsAvailable: seatsAvailableStr ? parseInt(seatsAvailableStr) : null,
      metroDistance: metroDistanceStr ? parseFloat(metroDistanceStr) : null,
    }
  });

  await clearLibraryCache(libraryId);
  revalidatePath('/admin');
  revalidatePath(`/admin/edit/${libraryId}`);
  revalidatePath('/');
}
