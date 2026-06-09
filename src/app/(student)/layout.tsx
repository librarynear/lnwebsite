import Link from "next/link";
import { ReactNode } from "react";
import { logout } from "@/app/actions/auth-actions";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top Navbar */}
      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 md:px-12 sticky top-0 z-50 shadow-sm">
        <Link href="/" className="text-2xl font-heading font-bold text-primary">
          FocusDesk
        </Link>

        <div className="flex items-center gap-6">
          <nav className="hidden md:flex gap-6">
            <Link href="/libraries" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Find a Library
            </Link>
            <Link href="/student/dashboard" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              My Bookings
            </Link>
          </nav>
          
          <div className="flex items-center gap-4 border-l border-border pl-6">
            <Link href="/student/dashboard" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Profile
            </Link>
            <form action={logout}>
              <button type="submit" className="text-sm font-medium text-destructive hover:opacity-80 transition-colors">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full bg-background flex flex-col">
        {children}
      </main>
    </div>
  );
}
