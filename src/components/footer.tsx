import Link from "next/link";
import { BookOpen, MessageCircle, ArrowRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-white mt-auto">
      <div className="container mx-auto px-6 md:px-10 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 group mb-4">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="text-xl font-bold tracking-tight text-foreground/90">
                Study<span className="text-primary">Stash</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              The modern directory for discovering the best libraries, reading rooms, and study spaces across India.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-3 text-foreground/90">Explore</h3>
            <ul className="space-y-2">
              <li><Link href="/delhi" className="text-sm text-muted-foreground hover:text-primary transition-colors">Libraries in Delhi</Link></li>
              <li><Link href="/compare" className="text-sm text-muted-foreground hover:text-primary transition-colors">Compare Spaces</Link></li>
              <li><Link href="/saved" className="text-sm text-muted-foreground hover:text-primary transition-colors">Saved List</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-3 text-foreground/90">Owners</h3>
            <ul className="space-y-2">
              <li><Link href="/for-owners" className="text-sm text-muted-foreground hover:text-primary transition-colors">Claim Listing</Link></li>
              <li><Link href="/pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">Pricing</Link></li>
              <li><Link href="/owner" className="text-sm text-muted-foreground hover:text-primary transition-colors">Dashboard</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-3 text-foreground/90">Connect</h3>
            <div className="flex items-center gap-4">
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <MessageCircle className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
        
        <div className="mt-12 flex flex-col md:flex-row items-center justify-between border-t border-border/40 pt-8 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} StudyStash by Compound. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="/legal/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="/legal/terms" className="hover:text-primary transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
