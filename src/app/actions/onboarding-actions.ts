'use server'

import prisma from "@/lib/prisma"
import { getSession } from "./auth-actions"
import { redirect } from "next/navigation"

export async function completeOnboarding(formData: FormData) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized: Please sign in first");
  }

  const name = formData.get("name") as string;
  const managerName = formData.get("managerName") as string;
  const managerPhone = formData.get("managerPhone") as string;
  const facilitiesStr = formData.get("facilities") as string;
  
  const address = formData.get("address") as string;
  const metroStation = formData.get("metroStation") as string;
  const googleMapsUrl = formData.get("googleMapsUrl") as string;
  const seatsAvailableStr = formData.get("seatsAvailable") as string;
  
  if (!name || !address) {
    throw new Error("Library Name and Address are required");
  }

  const facilities = facilitiesStr ? facilitiesStr.split(",").map(f => f.trim()).filter(f => f.length > 0) : [];
  const seatsAvailable = seatsAvailableStr ? parseInt(seatsAvailableStr) : null;

  // Check if they already have a library
  const existing = await prisma.library.findFirst({ where: { librarianId: session.userId } });
  if (existing) {
    redirect("/dashboard");
  }

  // Generate some random photos for MVP
  const defaultPhotos = [
    "https://images.unsplash.com/photo-1568667256549-094345857637?w=1200&q=80",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80"
  ];

  await prisma.library.create({
    data: {
      librarianId: session.userId,
      name,
      managerName,
      managerPhone,
      facilities,
      address,
      metroStation,
      googleMapsUrl,
      seatsAvailable,
      photos: defaultPhotos,
      city: "Demo City", // Default since it wasn't in onboarding MVP form
      locality: "Demo Locality",
    }
  });

  // Upgrade the user to a LIBRARIAN
  await prisma.user.update({
    where: { id: session.userId },
    data: { role: 'LIBRARIAN' }
  });

  redirect("/dashboard");
}
