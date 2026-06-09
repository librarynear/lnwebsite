import Link from "next/link";
import { ReactNode } from "react";
import { MobileNav } from "./MobileNav";
import { logout } from "@/app/actions/auth-actions";

export default function LibrarianLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex-col shadow-lg border-r border-sidebar-border hidden md:flex">
        <div className="p-6">
          <Link href="/dashboard" className="text-2xl font-heading font-bold text-sidebar-primary">
            Library Dashboard
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
        <header className="md:hidden flex items-center justify-between p-4 bg-sidebar text-sidebar-foreground">
          <Link href="/dashboard" className="text-xl font-heading font-bold text-sidebar-primary">
            Library Dashboard
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
