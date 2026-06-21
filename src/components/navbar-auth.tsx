import { getSession } from "@/app/actions/auth-actions";
import prisma from "@/lib/prisma";
import { UserNav } from "@/components/user-nav";
import Link from "next/link";

export async function NavbarAuth() {
  const session = await getSession();
  let user = null;
  if (session?.userId) {
    user = await prisma.user.findUnique({ where: { id: session.userId } });
  }

  if (session && user) {
    return <UserNav user={user} />;
  }

  return (
    <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors ml-2">
      Sign In
    </Link>
  );
}
