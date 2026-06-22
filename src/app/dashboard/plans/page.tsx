import prisma from "@/lib/prisma";
import { PlansClient } from "./PlansClient";
import { getSession } from "@/app/actions/auth-actions";
import { redirect } from "next/navigation";

export default async function PlansManagerPage() {
  const session = await getSession();
  if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN')) {
    redirect("/dashboard");
  }

  const library = await prisma.library.findFirst({
    where: session.role === 'ADMIN' ? {} : { librarianId: session.userId },
  });
  if (!library) redirect("/onboarding");

  // Fetch plans from live Supabase DB
  const plans = await prisma.plan.findMany({ where: { libraryId: library.id, isActive: true } });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PlansClient initialPlans={plans} />
    </div>
  );
}
