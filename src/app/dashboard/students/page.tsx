import prisma from "@/lib/prisma";
import { StudentsClient } from "./StudentsClient";
import { getSession } from "@/app/actions/auth-actions";
import { redirect } from "next/navigation";

export default async function ManageStudentsPage() {
  const session = await getSession();
  if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN' && session.role !== 'RECEPTIONIST')) redirect("/");

  const library = await prisma.library.findFirst({ where: session.role === 'ADMIN' ? {} : (session.role === 'RECEPTIONIST' ? { id: session.employerLibraryId as string } : { librarianId: session.userId }) });
  if (!library) redirect("/onboarding");

  const bookings = await prisma.booking.findMany({
    where: { libraryId: library.id },
    include: {
      student: true,
      plan: true,
      standaloneLocker: true
    },
    orderBy: { createdAt: 'desc' },
    take: 200 // TODO: cursor pagination in StudentsClient for very large libraries
  });

  const plans = await prisma.plan.findMany({
    where: { libraryId: library.id }
  });

  const logs = await prisma.checkinLog.findMany({
    where: { libraryId: library.id },
    include: { student: true, relay: true },
    orderBy: { timestamp: 'desc' },
    take: 50
  });

  const relays = await prisma.relay.findMany({
    where: { libraryId: library.id }
  });

  const seats = await prisma.seat.findMany({
    where: { libraryId: library.id },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <StudentsClient bookings={bookings} plans={plans} logs={logs} relays={relays} seats={seats} />
    </div>
  );
}
