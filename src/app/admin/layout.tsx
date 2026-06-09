import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/auth-actions";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth-actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  
  if (!session) {
    redirect("/login");
  }

  // Admin Check / Auto-Upgrade
  if (session.role !== "ADMIN") {
    const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(",").map(e => e.trim().toLowerCase()) : [];
    
    if (adminEmails.includes(session.email.toLowerCase())) {
      // Auto-upgrade to ADMIN
      await prisma.user.update({
        where: { id: session.userId },
        data: { role: "ADMIN" }
      });
      // The session object won't reflect this update until the next request, but we can safely proceed for this render
    } else {
      redirect("/dashboard"); // Redirect unauthorized users
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Admin Navbar */}
      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-xl font-heading font-bold text-primary">
            Admin Portal
          </Link>
          <span className="text-xs px-2 py-1 bg-destructive/10 text-destructive rounded-full font-bold uppercase tracking-wide">
            Superuser
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{session.email}</span>
          <form action={logout}>
            <button type="submit" className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
              <LogOut className="w-5 h-5" />
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
