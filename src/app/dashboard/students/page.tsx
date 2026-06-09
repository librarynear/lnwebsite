import prisma from "@/lib/prisma";
import { StudentsClient } from "./StudentsClient";
import { getSession } from "@/app/actions/auth-actions";
import { redirect } from "next/navigation";

export default async function ManageStudentsPage() {
  const session = await getSession();
  if (!session || session.role !== 'LIBRARIAN') redirect("/");

  const library = await prisma.library.findFirst({ where: { librarianId: session.userId } });
  if (!library) redirect("/onboarding");

  const bookings = await prisma.booking.findMany({
    where: { libraryId: library.id },
    include: {
      student: true,
      plan: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const plans = await prisma.plan.findMany({
    where: { libraryId: library.id }
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <StudentsClient bookings={bookings} plans={plans} />
    </div>
  );
}
