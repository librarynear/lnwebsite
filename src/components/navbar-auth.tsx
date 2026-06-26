import { getSession } from "@/app/actions/auth-actions";
import prisma from "@/lib/prisma";
import { UserNav } from "@/components/user-nav";
import Link from "next/link";
import { NotificationBell } from "./NotificationBell";

export async function NavbarAuth() {
  const session = await getSession();
  let notifications: any[] = [];
  let user = null;
  if (session?.userId) {
    user = await prisma.user.findUnique({ where: { id: session.userId } });
    notifications = await prisma.notification.findMany({
      where: { studentId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
  }

  if (session && user) {
    return (
      <div className="flex items-center">
        <NotificationBell notifications={notifications} />
        <UserNav user={user} />
      </div>
    );
  }

  return (
    <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors ml-2">
      Sign In
    </Link>
  );
}
