import { getSession } from "@/app/actions/auth-actions";
import prisma from "@/lib/prisma";
import { UserNav } from "@/components/user-nav";
import Link from "next/link";
import { NotificationBell } from "./NotificationBell";
import { AccessQRModal } from "./AccessQRModal";
import type { Notification } from "@prisma/client";

export async function NavbarAuth() {
  const session = await getSession();
  let notifications: Notification[] = [];
  let user = null;
  let activeBooking = null;

  if (session?.userId) {
    user = await prisma.user.findUnique({ where: { id: session.userId } });
    notifications = await prisma.notification.findMany({
      where: { studentId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    
    // Find if the user has an active booking to show the QR Code icon
    activeBooking = await prisma.booking.findFirst({
      where: {
        studentId: session.userId,
        status: "CONFIRMED",
        startTime: { lte: new Date() },
        endTime: { gt: new Date() }
      }
    });
  }

  if (session && user) {
    return (
      <div className="flex items-center gap-1 sm:gap-2">
        {activeBooking && (
          <AccessQRModal libraryId={activeBooking.libraryId} studentId={session.userId} iconOnly />
        )}
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
