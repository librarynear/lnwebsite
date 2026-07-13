import { NavItem } from "./NavItem";
import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { MobileNav } from "./MobileNav";
import { logout, getSession } from "@/app/actions/auth-actions";
import prisma from "@/lib/prisma";
import { ExternalLink, Globe } from "lucide-react";
import { Suspense } from "react";
import { RealtimeProvider } from "@/components/RealtimeProvider";
import { CommandMenu } from "@/components/CommandMenu";
import { Search } from "lucide-react";

async function DashboardAuthWrapper({ children }: { children: ReactNode }) {
  const session = await getSession();
  // Defence in depth: gate the whole dashboard surface to staff. Individual
  // pages also guard, but the layout ensures no page can accidentally leak.
  if (!session) redirect("/login");
  if (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN' && session.role !== 'RECEPTIONIST') redirect("/");

  const library = await prisma.library.findFirst({ where: session.role === 'ADMIN' ? {} : (session.role === 'RECEPTIONIST' ? { id: session.employerLibraryId as string } : { librarianId: session.userId }) });
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex-col shadow-lg border-r border-sidebar-border hidden md:flex">
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <Image src="https://ik.imagekit.io/focusdesk/logo.png" alt="FocusX Logo" width={32} height={32} className="object-contain" />
            <span className="text-xl font-heading font-bold text-sidebar-primary">FocusX</span>
          </Link>
          <div className="mt-6 flex items-center justify-between px-3 py-2 bg-background/50 border border-border rounded-md text-sm text-muted-foreground shadow-sm">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 opacity-70" />
              <span>Search...</span>
            </div>
            <kbd className="font-sans text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border tracking-widest opacity-70">⌘K</kbd>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem href="/dashboard">
            Overview
          </NavItem>
          <NavItem href="/dashboard/students">
            Students
          </NavItem>
          <NavItem href="/dashboard/queries">
            Queries
          </NavItem>
          <NavItem href="/dashboard/inquiries">
            Inquiries
          </NavItem>
          {session.role !== 'RECEPTIONIST' && (
            <>
              <NavItem href="/dashboard/financials">
                Financials
              </NavItem>
              <NavItem href="/dashboard/seats">
                Manage Seats
              </NavItem>
              <NavItem href="/dashboard/plans">
                Manage Plans
              </NavItem>
            </>
          )}
          <NavItem href="/dashboard/approvals">
            Pending Approvals
          </NavItem>
        </nav>

        <div className="p-4 border-t border-sidebar-border mt-auto">

          {session.role !== 'RECEPTIONIST' && (
            <>
              <NavItem href="/dashboard/staff">
                Staff & Roles
              </NavItem>
              <NavItem href="/dashboard/widgets">
                Widgets
              </NavItem>
              <NavItem href="/dashboard/settings">
                Settings
              </NavItem>
            </>
          )}
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
            <Image src="https://ik.imagekit.io/focusdesk/logo.png" alt="FocusX Logo" width={32} height={32} className="object-contain" />
            <span className="text-xl font-heading font-bold text-sidebar-primary hidden sm:block">FocusX</span>
          </Link>
          <MobileNav role={session.role} />
        </header>
        
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-background">
          <RealtimeProvider>
            {children}
          </RealtimeProvider>
        </div>
      </main>
      
      <CommandMenu />
    </div>
  );
}

export default function LibrarianLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
          <p className="text-muted-foreground font-medium">Loading Dashboard...</p>
        </div>
      </div>
    }>
      <DashboardAuthWrapper>{children}</DashboardAuthWrapper>
    </Suspense>
  );
}
