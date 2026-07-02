"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSession } from "./auth-actions"

export async function submitInquiry(formData: FormData) {
  try {
    const libraryId = formData.get("libraryId") as string;
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;
    const message = formData.get("message") as string;

    if (!libraryId || !name || !phone) {
      return { success: false, error: "Missing required fields" };
    }

    await prisma.inquiry.create({
      data: {
        libraryId,
        name,
        phone,
        message,
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error("Inquiry error:", error);
    return { success: false, error: "Failed to submit inquiry" };
  }
}

export async function updateInquiryStatus(inquiryId: string, status: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'CLOSED', libraryId: string) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN')) return { success: false };

    const validStatuses = ['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED'];
    if (!validStatuses.includes(status)) return { success: false };

    // Authorize against the inquiry's ACTUAL library, not the client-supplied
    // libraryId. Without this, a librarian could pass their own libraryId while
    // targeting an inquiryId that belongs to a different library (IDOR).
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
      select: { libraryId: true },
    });
    if (!inquiry) return { success: false };

    if (session.role === 'LIBRARIAN') {
      const lib = await prisma.library.findFirst({
        where: { id: inquiry.libraryId, librarianId: session.userId },
        select: { id: true },
      });
      if (!lib) return { success: false };
    }

    await prisma.inquiry.update({
      where: { id: inquiryId },
      data: { status }
    });

    revalidatePath("/dashboard/inquiries");
    return { success: true };
  } catch (error: any) {
    console.error("Update inquiry error:", error);
    return { success: false };
  }
}
