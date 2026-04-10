import Link from "next/link";
import { BookOpen } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-white">
      <div className="container mx-auto flex h-20 items-center justify-between px-6 md:px-10">
        <Link href="/" className="flex items-center gap-2 group text-primary">
          <BookOpen className="h-8 w-8" strokeWidth={2.5} />
          <span className="text-2xl font-bold tracking-tight hidden sm:block">
            study<span className="italic font-extrabold">stash</span>
          </span>
        </Link>
        
        <div className="flex items-center gap-4">
          <Link href="/for-owners" className="text-sm font-semibold rounded-full hover:bg-secondary px-4 py-2 transition-colors">
            StudyStash for Owners
          </Link>
          <div className="flex items-center gap-3 border border-border p-1 pl-3 pr-2 rounded-full hover:shadow-md transition-shadow cursor-pointer">
            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{display: 'block', fill: 'none', height: '16px', width: '16px', stroke: 'currentcolor', strokeWidth: 3, overflow: 'visible'}}><g fill="none" fillRule="nonzero"><path d="m2 16h28"></path><path d="m2 24h28"></path><path d="m2 8h28"></path></g></svg>
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground overflow-hidden">
              <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{display: 'block', height: '100%', width: '100%', fill: 'currentcolor'}}><path d="m16 .7c-8.437 0-15.3 6.863-15.3 15.3s6.863 15.3 15.3 15.3 15.3-6.863 15.3-15.3-6.863-15.3-15.3-15.3zm0 28c-4.021 0-7.605-1.884-9.933-4.81a12.425 12.425 0 0 1 6.451-4.4 6.507 6.507 0 0 1 -3.018-5.49c0-3.584 2.916-6.5 6.5-6.5s6.5 2.916 6.5 6.5a6.513 6.513 0 0 1 -3.019 5.491 12.42 12.42 0 0 1 6.452 4.4c-2.328 2.925-5.912 4.809-9.933 4.809z"></path></svg>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
