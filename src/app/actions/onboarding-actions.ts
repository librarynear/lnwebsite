'use server'

import prisma from "@/lib/prisma"
import { getSession } from "./auth-actions"
import { redirect } from "next/navigation"
import { parseSafeUrl } from "@/lib/validation"

export async function completeOnboarding(formData: FormData) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized: Please sign in first");
  }

  const name = formData.get("name") as string;
  const managerName = formData.get("managerName") as string;
  const managerPhone = formData.get("managerPhone") as string;
  const address = formData.get("address") as string;
  const metroStation = formData.get("metroStation") as string;
  const googleMapsUrl = parseSafeUrl(formData.get("googleMapsUrl"), "Google Maps URL");
  const seatsAvailableStr = formData.get("seatsAvailable") as string;
  
  if (!name || !address) {
    throw new Error("Library Name and Address are required");
  }

  const facilities: string[] = [];
  formData.forEach((value, key) => {
    if (key.startsWith("facility_")) {
      facilities.push(key.replace("facility_", ""));
    }
  });
  const seatsAvailable = seatsAvailableStr ? (parseInt(seatsAvailableStr) || null) : null;

  // Check if they already have a library
  const existing = await prisma.library.findFirst({ where: session.role === 'ADMIN' ? {} : { librarianId: session.userId } });
  if (existing) {
    redirect("/dashboard");
  }

  const library = await prisma.library.create({
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
      // Start with no photos; the feed shows a graceful fallback until the
      // librarian uploads real images (avoids every new library sharing the
      // same stock photo).
      photos: [],
      city: "Demo City", // Default since it wasn't in onboarding MVP form
      locality: "Demo Locality",
    }
  });

  // Role promotion to LIBRARIAN happens via admin approval in approveLibrary action
  // Do NOT self-promote here

  return { success: true, libraryId: library.id };
}
