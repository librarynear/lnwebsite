import prisma from "@/lib/prisma"
import { notFound } from "next/navigation"
import { LibraryClient } from "./LibraryClient"
import { getSession } from "@/app/actions/auth-actions"

export default async function LibraryDetailsPage(props: any) {
  const params = await props.params;
  const id = params?.id;

  if (!id) {
    return notFound()
  }

  const library = await prisma.library.findUnique({
    where: { id },
    include: {
      plans: true,
      seats: true,
      standaloneLockers: true
    }
  })

  if (!library) {
    return notFound()
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
      seatId: true
    }
  });

  const occupiedSeatIds = activeBookings.map(b => b.seatId).filter(Boolean) as string[];
  const session = await getSession();

  return <LibraryClient library={library} occupiedSeatIds={occupiedSeatIds} studentId={session?.userId || ""} />
}
