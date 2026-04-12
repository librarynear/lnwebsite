import Link from "next/link";
import { Building2, ClipboardList } from "lucide-react";

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-bold text-black">Sales Workspace</h1>
            <p className="text-xs text-muted-foreground">Assigned library cleanup and verification</p>
          </div>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/sales/libraries" className="flex items-center gap-2 text-black hover:text-primary">
              <Building2 className="h-4 w-4" />
              Libraries
            </Link>
            <Link href="/admin/team" className="flex items-center gap-2 text-black hover:text-primary">
              <ClipboardList className="h-4 w-4" />
              Team
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
