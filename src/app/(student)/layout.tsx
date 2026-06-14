import Link from "next/link";
import { ReactNode } from "react";
import { logout } from "@/app/actions/auth-actions";

import { getSession } from "@/app/actions/auth-actions";
import Image from "next/image";
import { ScrollDirection } from "@/components/scroll-direction";
import { UserNav } from "@/components/user-nav";
import { Footer } from "@/components/footer";
import prisma from "@/lib/prisma";
import { Plus } from "lucide-react";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  let user = null;
  if (session?.userId) {
    user = await prisma.user.findUnique({ where: { id: session.userId } });
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <ScrollDirection />
      {/* Top Navbar */}
      <header className="navbar-sticky sticky top-0 z-50 w-full border-b border-border bg-white transition-transform duration-300 ease-in-out">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:h-20 md:px-10">
          <Link href="/" className="flex items-center gap-2 group">
            <Image src="https://ik.imagekit.io/focusdesk/logo.png" alt="FocusDesk Logo" width={32} height={32} className="object-contain" />
            <span className="text-2xl tracking-tight hidden sm:block">
              <span className="text-primary font-heading font-bold text-[22px]">FocusDesk</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 md:gap-4">
            <Link
              href="/onboarding"
              className="flex items-center gap-1.5 text-xs font-semibold rounded-full bg-[#0a1128] text-white hover:bg-[#0a1128]/90 px-4 py-2 transition-colors md:px-5 md:text-[14px]"
            >
              <Plus className="w-4 h-4" />
              Add Your Library
            </Link>
            
            {session && user ? (
              <UserNav user={user} />
            ) : (
              <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors ml-2">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full bg-background flex flex-col">
        {children}
      </main>

      <Footer />
    </div>
  );
}
