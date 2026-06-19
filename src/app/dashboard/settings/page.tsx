import prisma from "@/lib/prisma"
import { SettingsClient } from "./SettingsClient"
import { getSession } from "@/app/actions/auth-actions"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getSession();
  if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN')) {
    redirect("/dashboard");
  }

  const library = await prisma.library.findFirst({ where: session.role === 'ADMIN' ? {} : { librarianId: session.userId } });
  
  if (!library) {
    redirect("/onboarding");
  }

  return <SettingsClient library={library} />
}
