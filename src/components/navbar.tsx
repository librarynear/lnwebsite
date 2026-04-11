import Link from "next/link";
import { Layers, MapPin } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-white">
      <div className="container mx-auto flex h-20 items-center justify-between px-6 md:px-10">
        <Link href="/" className="flex items-center gap-2 group">
          <img src="/logo.png" alt="LibraryNear Logo" className="h-10 w-auto object-contain shrink-0" />
          <span className="text-2xl tracking-tight hidden sm:block">
            <span className="text-primary/80 font-semibold text-[22px]">Library</span><span className="text-primary font-bold text-[22px]">Near</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/for-owners" className="text-[13px] font-semibold rounded-full border border-primary text-primary hover:bg-primary/5 px-4 py-1.5 transition-colors">
            List Your Library
          </Link>
          <div className="flex h-9 w-9 rounded-full bg-muted/80 text-muted-foreground font-semibold items-center justify-center text-sm cursor-pointer hover:bg-muted transition-colors">
            U
          </div>
        </div>
      </div>
    </header>
  );
}
