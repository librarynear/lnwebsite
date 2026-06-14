import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { MobileNav } from "./MobileNav";
import { logout, getSession } from "@/app/actions/auth-actions";
import prisma from "@/lib/prisma";
import { ExternalLink, Globe } from "lucide-react";

export default async function LibrarianLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  // Defence in depth: gate the whole dashboard surface to staff. Individual
  // pages also guard, but the layout ensures no page can accidentally leak.
  if (!session) redirect("/login");
  if (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN') redirect("/");

  const library = await prisma.library.findFirst({ where: session.role === 'ADMIN' ? {} : { librarianId: session.userId } });
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex-col shadow-lg border-r border-sidebar-border hidden md:flex">
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <Image src="https://ik.imagekit.io/focusdesk/logo.png" alt="FocusDesk Logo" width={32} height={32} className="object-contain" />
            <span className="text-xl font-heading font-bold text-sidebar-primary">FocusDesk</span>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <Link href="/dashboard" className="block px-4 py-2.5 rounded-lg font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
            Overview
          </Link>
          <Link href="/dashboard/seats" className="block px-4 py-2.5 rounded-lg font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
            Manage Seats
          </Link>
          <Link href="/dashboard/plans" className="block px-4 py-2.5 rounded-lg font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
            Manage Plans
          </Link>
          <Link href="/dashboard/students" className="block px-4 py-2.5 rounded-lg font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
            Students
          </Link>
          <Link href="/dashboard/queries" className="block px-4 py-2.5 rounded-lg font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
            Queries
          </Link>
          {library && (
            <Link href={`/library/${library.id}`} target="_blank" className="flex items-center justify-between px-4 py-2.5 rounded-lg font-medium text-primary hover:bg-primary/10 transition-colors mt-4 border border-primary/20">
              View Public Page <ExternalLink className="w-4 h-4" />
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-sidebar-border mt-auto">

          <Link href="/dashboard/settings" className="block px-4 py-2.5 rounded-lg font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
            Settings
          </Link>
          <form action={logout}>
            <button type="submit" className="w-full text-left px-4 py-2.5 mt-2 rounded-lg font-medium text-destructive hover:bg-destructive/10 transition-colors">
              Logout
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden max-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <Image src="https://ik.imagekit.io/focusdesk/logo.png" alt="FocusDesk Logo" width={32} height={32} className="object-contain" />
            <span className="text-xl font-heading font-bold text-sidebar-primary hidden sm:block">FocusDesk</span>
          </Link>
          <MobileNav />
        </header>
        
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-background">
          {children}
        </div>
      </main>
    </div>
  );
}
