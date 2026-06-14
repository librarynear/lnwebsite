import { getSession } from "@/app/actions/auth-actions";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { ProfileClient } from "./ProfileClient";

export default async function StudentProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });

  if (!user) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 w-full">
      <div className="mb-8">
        <h1 className="text-4xl font-heading font-black text-foreground">My Profile</h1>
        <p className="text-muted-foreground mt-2 text-lg">Manage your personal information, KYC details, and profile photo.</p>
      </div>

      <ProfileClient user={user} />
    </div>
  );
}
