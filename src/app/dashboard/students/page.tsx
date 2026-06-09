import prisma from "@/lib/prisma";
import { StudentsClient } from "./StudentsClient";

export default async function ManageStudentsPage() {
  const bookings = await prisma.booking.findMany({
    include: {
      student: true,
      plan: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const plans = await prisma.plan.findMany();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <StudentsClient bookings={bookings} plans={plans} />
    </div>
  );
}
