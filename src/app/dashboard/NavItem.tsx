'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export function NavItem({ href, onClick, children }: { href: string, onClick?: () => void, children: ReactNode }) {
  const pathname = usePathname();
  
  // Exact match for /dashboard, prefix match for others
  const isActive = href === "/dashboard" 
    ? pathname === "/dashboard" 
    : pathname.startsWith(href);

  return (
    <Link 
      href={href} 
      onClick={onClick}
      className={`block px-4 py-2.5 rounded-lg font-medium transition-colors ${
        isActive 
          ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' 
          : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground'
      }`}
    >
      {children}
    </Link>
  );
}
