import prisma from "@/lib/prisma"
import { notFound } from "next/navigation"
import { cache } from "react"
import type { Metadata } from "next"
import { LibraryClient } from "./LibraryClient"
import { getSession } from "@/app/actions/auth-actions"

export const revalidate = 60; // Cache this page on Vercel's Edge CDN for 60 seconds

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.focusdesk.in';

// Deduped per-request fetch so generateMetadata and the page share one query.
const getLibraryForMeta = cache(async (id: string) =>
  prisma.library.findUnique({
    where: { id },
    select: { name: true, address: true, locality: true, city: true, photos: true, plans: { select: { price: true } } },
  })
);

// Pre-render the approved library pages at build time for instant first paint + SEO.
export async function generateStaticParams() {
  try {
    const libraries = await prisma.library.findMany({
      where: { kycStatus: "APPROVED" },
      select: { id: true },
      take: 1000,
    });
    return libraries.map((lib) => ({ id: lib.id }));
  } catch {
    return [];
  }
}

export async function generateMetadata(props: any): Promise<Metadata> {
  const params = await props.params;
  const id = params?.id;
  if (!id) return {};

  const library = await getLibraryForMeta(id);
  if (!library) {
    return { title: "Library not found" };
  }

  const area = library.locality || library.city || "your area";
  const minPrice = library.plans.length > 0 ? Math.min(...library.plans.map((p) => p.price)) : 500;
  const title = `${library.name} — Study Library in ${area}`;
  const description = `Book a seat at ${library.name}, a premium study library in ${area}${library.city ? `, ${library.city}` : ''}. Plans from ₹${minPrice}/mo with verified amenities. Reserve on FocusDesk.`;
  const canonical = `${APP_URL}/library/${id}`;
  const image = library.photos.length > 0 ? library.photos[0] : "https://ik.imagekit.io/focusdesk/logo.png";

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: [{ url: image, width: 1200, height: 630, alt: `${library.name} study library` }],
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function LibraryDetailsPage(props: any) {
  const params = await props.params;
  const id = params?.id;

  if (!id) {
    return notFound()
  }

  // Use ISR (revalidate) instead of direct Upstash Redis calls to prevent quota exhaustion
  // The Prisma client handles PgBouncer pooling.
  const library = await prisma.library.findUnique({
    where: { id },
    include: {
      plans: true,
      seats: true,
      standaloneLockers: true
    }
  });

  if (!library) {
    return notFound()
  }

  const session = await getSession();

  let currentPlanEndDate = null;
  let studentActiveBookingId = null;
  if (session?.userId) {
    const studentActiveBooking = await prisma.booking.findFirst({
      where: {
        studentId: session.userId,
        libraryId: library.id,
        status: "CONFIRMED",
        endTime: { gt: new Date() }
      },
      orderBy: { endTime: 'desc' }
    });
    if (studentActiveBooking) {
      currentPlanEndDate = studentActiveBooking.endTime.toISOString();
      studentActiveBookingId = studentActiveBooking.id;
    }
  }

  // Get active bookings to calculate seat availability
  const activeBookings = await prisma.booking.findMany({
    where: {
      libraryId: library.id,
      status: {
        in: ['CONFIRMED', 'COMPLETED']
      },
      endTime: {
        gt: new Date()
      }
    },
    select: {
      id: true,
      seatId: true,
      standaloneLockerId: true
    }
  });

  const occupiedSeatIds = activeBookings
    .filter(b => b.id !== studentActiveBookingId)
    .map(b => b.seatId)
    .filter(Boolean) as string[];
  const occupiedLockerIds = activeBookings.map(b => b.standaloneLockerId).filter(Boolean) as string[];

  // Filter out occupied lockers so they can't be booked
  library.standaloneLockers = library.standaloneLockers.filter((l: any) => !occupiedLockerIds.includes(l.id));

  // Generate JSON-LD Structured Data
  const minPrice = library.plans.length > 0 
    ? Math.min(...library.plans.map((p: any) => p.price)) 
    : 500;
  const maxPrice = library.plans.length > 0 
    ? Math.max(...library.plans.map((p: any) => p.price)) 
    : 2000;

  const schema = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "Library"],
    "name": library.name,
    "image": library.photos.length > 0 ? library.photos[0] : "https://ik.imagekit.io/focusdesk/logo.png",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": library.address,
      "addressLocality": library.locality || library.city || "Delhi",
      "addressRegion": library.state || "Delhi",
      "postalCode": library.pinCode || "110001",
      "addressCountry": "IN"
    },
    "priceRange": `₹${minPrice} - ₹${maxPrice}`,
    "telephone": library.managerPhone || "",
    "url": `${APP_URL}/library/${library.id}`,
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "opens": library.openingTime || "06:00",
        "closes": library.closingTime || "22:00"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <LibraryClient 
        library={library} 
        occupiedSeatIds={occupiedSeatIds} 
        studentId={session?.userId || ""} 
        currentPlanEndDate={currentPlanEndDate} 
        studentPhone={session?.phone || ""}
        studentEmail={session?.email || ""}
      />
    </>
  )
}
