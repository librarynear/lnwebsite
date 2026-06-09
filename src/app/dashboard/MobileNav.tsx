'use client'

import { useState } from "react"
import Link from "next/link"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="p-2 md:hidden hover:bg-sidebar-accent rounded-lg transition-colors cursor-pointer text-sidebar-foreground">
        <Menu className="w-6 h-6" />
      </SheetTrigger>
      <SheetContent side="left" className="w-64 bg-sidebar text-sidebar-foreground border-sidebar-border p-0 flex flex-col pt-12">
        <VisuallyHidden>
          <SheetTitle>Mobile Navigation</SheetTitle>
        </VisuallyHidden>
        <nav className="flex-1 px-4 space-y-2">
          <Link onClick={() => setOpen(false)} href="/dashboard" className="block px-4 py-2.5 rounded-lg font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
            Overview
          </Link>
          <Link onClick={() => setOpen(false)} href="/dashboard/seats" className="block px-4 py-2.5 rounded-lg font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
            Manage Seats
          </Link>
          <Link onClick={() => setOpen(false)} href="/dashboard/plans" className="block px-4 py-2.5 rounded-lg font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
            Manage Plans
          </Link>
          <Link onClick={() => setOpen(false)} href="/dashboard/students" className="block px-4 py-2.5 rounded-lg font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
            Students
          </Link>
          <Link onClick={() => setOpen(false)} href="/dashboard/queries" className="block px-4 py-2.5 rounded-lg font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
            Queries
          </Link>
        </nav>
        
        <div className="p-4 border-t border-sidebar-border mt-auto">
          <Link onClick={() => setOpen(false)} href="/dashboard/settings" className="block px-4 py-2.5 rounded-lg font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
            Settings
          </Link>
          <button className="w-full text-left px-4 py-2.5 mt-2 rounded-lg font-medium text-destructive hover:bg-destructive/10 transition-colors">
            Logout
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
