'use server'

import prisma from "@/lib/prisma"
import { getSession } from "./auth-actions"
import Razorpay from "razorpay"

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

export async function createRazorpayLinkedAccount() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const library = await prisma.library.findFirst({
    where: session.role === 'ADMIN' ? {} : { librarianId: session.userId },
    include: { librarian: true }
  });

  if (!library) throw new Error("Library not found");
  if (library.paymentAccountId) return library.paymentAccountId; // Already has an account

  try {
    const account = await razorpay.accounts.create({
      email: library.librarian.email || "no-reply@focusdesk.in",
      phone: library.librarian.phone || library.managerPhone || "9999999999",
      type: "route",
      legal_business_name: library.name,
      business_type: "individual", // default for MVP
      contact_name: library.managerName || library.librarian.name || "Manager",
      profile: {
        category: "education",
        subcategory: "educational_institutions",
        addresses: {
          registered: {
            street1: library.address,
            street2: library.locality || "Locality",
            city: library.city || "Demo City",
            state: library.state || "Demo State",
            postal_code: library.pinCode || "110001",
            country: "IN"
          }
        }
      },
      notes: {
        libraryId: library.id
      }
    }) as any;

    await prisma.library.update({
      where: { id: library.id },
      data: { paymentAccountId: account.id }
    });

    return account.id;
  } catch (error: any) {
    console.error("Razorpay account creation failed:", error);
    throw new Error(error?.error?.description || "Failed to create Razorpay account. Check if Route is enabled.");
  }
}

export async function getRazorpayOnboardingLink() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const library = await prisma.library.findFirst({
    where: session.role === 'ADMIN' ? {} : { librarianId: session.userId }
  });

  if (!library || !library.paymentAccountId) {
    throw new Error("No payment account found");
  }

  // The razorpay node SDK doesn't expose account onboarding links directly in older versions,
  // so we'll use a direct fetch to the Razorpay API.
  const auth = Buffer.from(`${process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  
  const response = await fetch(`https://api.razorpay.com/beta/accounts/${library.paymentAccountId}/onboarding_links`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings?kyc=cancelled`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings?kyc=success`
    })
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error("Failed to generate onboarding link:", data);
    throw new Error(data?.error?.description || "Failed to generate onboarding link");
  }

  return data.short_url;
}
