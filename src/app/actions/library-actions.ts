'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "./auth-actions"

export async function updateLibrarySettings(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'LIBRARIAN') throw new Error("Unauthorized");
  
  const id = formData.get("id") as string;
  
  const library = await prisma.library.findUnique({ where: { id } });
  if (!library || library.librarianId !== session.userId) {
    throw new Error("Unauthorized: You don't own this library.");
  }
  
  const name = formData.get("name") as string;
  const managerName = formData.get("managerName") as string;
  const managerPhone = formData.get("managerPhone") as string;
  const address = formData.get("address") as string;
  
  const locality = formData.get("locality") as string;
  const city = formData.get("city") as string;
  const district = formData.get("district") as string;
  const state = formData.get("state") as string;
  const pinCode = formData.get("pinCode") as string;
  
  const metroStation = formData.get("metroStation") as string;
  const metroDistanceStr = formData.get("metroDistance") as string;
  const metroDistance = metroDistanceStr ? parseFloat(metroDistanceStr) : null;
  const googleMapsUrl = formData.get("googleMapsUrl") as string;
  
  const openingTime = formData.get("openingTime") as string;
  const closingTime = formData.get("closingTime") as string;
  const whatsapp = formData.get("whatsapp") as string;
  
  const description = formData.get("description") as string;
  const seatsAvailableStr = formData.get("seatsAvailable") as string;
  const seatsAvailable = seatsAvailableStr ? parseInt(seatsAvailableStr) : null;
  
  const photosStr = formData.get("photos") as string;
  const photos = photosStr ? JSON.parse(photosStr) : [];
  
  // Extract all checked facilities
  const facilities: string[] = [];
  const facilityOptions = [
    "AC", "Wi-Fi", "RO Water", "Washroom", "Power Backup", 
    "CCTV", "Locker", "Parking", "Tea/Coffee", 
    "Security Guard", "Charging Points", "Silent Zone"
  ];
  
  for (const facility of facilityOptions) {
    if (formData.get(`facility_${facility}`) === "on") {
      facilities.push(facility);
    }
  }

  await prisma.library.update({
    where: { id },
    data: {
      name,
      managerName,
      managerPhone,
      address,
      locality,
      city,
      district,
      state,
      pinCode,
      metroStation,
      metroDistance,
      googleMapsUrl,
      openingTime,
      closingTime,
      whatsapp,
      description,
      seatsAvailable,
      photos,
      facilities
    }
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/libraries"); 
  revalidatePath(`/library/${id}`); 
}
