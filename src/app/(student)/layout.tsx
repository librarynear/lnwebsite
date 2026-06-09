import Link from "next/link";
import { ReactNode } from "react";
import { logout } from "@/app/actions/auth-actions";

import { getSession } from "@/app/actions/auth-actions";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top Navbar */}
      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 md:px-12 sticky top-0 z-50 shadow-sm">
        <Link href="/" className="text-2xl font-heading font-bold text-primary">
          FocusDesk
        </Link>

        <div className="flex items-center gap-6">
          <nav className="hidden md:flex gap-6">
            <Link href="/onboarding" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              List Your Library
            </Link>
            {session && (
              <Link href="/student/dashboard" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                My Bookings
              </Link>
            )}
          </nav>
          
          <div className="flex items-center gap-4 border-l border-border pl-6">
            {!session ? (
              <>
                <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
                  Sign In
                </Link>
                <Link href="/signup" className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                  Register
                </Link>
              </>
            ) : (
              <>
                <Link href="/student/dashboard" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                  Profile
                </Link>
                <form action={logout}>
                  <button type="submit" className="text-sm font-medium text-destructive hover:opacity-80 transition-colors">
                    Logout
                  </button>
                </form>
              </>
            )}
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
