import prisma from "@/lib/prisma";
import { PlansClient } from "./PlansClient";
import { getSession } from "@/app/actions/auth-actions";
import { redirect } from "next/navigation";

export default async function PlansManagerPage() {
  const session = await getSession();
  if (!session || session.role !== 'LIBRARIAN') redirect("/");

  const library = await prisma.library.findFirst({ where: { librarianId: session.userId } });
  if (!library) redirect("/onboarding");

  // Fetch plans from live Supabase DB
  const plans = await prisma.plan.findMany({ where: { libraryId: library.id } });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PlansClient initialPlans={plans} />
    </div>
  );
}
