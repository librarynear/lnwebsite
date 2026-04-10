import { logout } from "./actions";
import Link from "next/link";
import { Search, Users, Building2, LogOut, BarChart3 } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-border flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border text-black font-bold text-lg gap-2">
          <div className="bg-primary text-white p-1 rounded-md">
            <Search className="w-4 h-4" strokeWidth={3} />
          </div>
          StudyStash Admin
        </div>

        <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors text-black"
          >
            <Users className="w-4 h-4" />
            Leads Inbox
          </Link>
          <Link
            href="/admin/libraries"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors text-black"
          >
            <Building2 className="w-4 h-4" />
            Libraries Editor
          </Link>
          <Link
            href="/admin/analytics"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors text-black"
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </Link>
        </nav>

        <div className="p-4 border-t border-border">
          <form action={logout}>
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
