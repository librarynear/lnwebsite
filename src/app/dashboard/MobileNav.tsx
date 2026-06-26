'use client'

import { useState } from "react"
import { NavItem } from "./NavItem"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { logout } from "@/app/actions/auth-actions"

export function MobileNav({ role }: { role: string }) {
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
          <NavItem onClick={() => setOpen(false)} href="/dashboard">
            Overview
          </NavItem>
          {role !== 'RECEPTIONIST' && (
            <>
              <NavItem onClick={() => setOpen(false)} href="/dashboard/seats">
                Manage Seats
              </NavItem>
              <NavItem onClick={() => setOpen(false)} href="/dashboard/plans">
                Manage Plans
              </NavItem>
            </>
          )}
          <NavItem onClick={() => setOpen(false)} href="/dashboard/students">
            Students
          </NavItem>
          <NavItem onClick={() => setOpen(false)} href="/dashboard/queries">
            Queries
          </NavItem>
          <NavItem onClick={() => setOpen(false)} href="/dashboard/inquiries">
            Inquiries
          </NavItem>
          {role !== 'RECEPTIONIST' && (
            <NavItem onClick={() => setOpen(false)} href="/dashboard/financials">
              Financials
            </NavItem>
          )}
        </nav>
        
        <div className="p-4 border-t border-sidebar-border mt-auto">
          {role !== 'RECEPTIONIST' && (
            <>
              <NavItem onClick={() => setOpen(false)} href="/dashboard/staff">
                Staff & Roles
              </NavItem>
              <NavItem onClick={() => setOpen(false)} href="/dashboard/widgets">
                Widgets
              </NavItem>
              <NavItem onClick={() => setOpen(false)} href="/dashboard/settings">
                Settings
              </NavItem>
            </>
          )}
          <form action={logout}>
            <button type="submit" className="w-full text-left px-4 py-2.5 mt-2 rounded-lg font-medium text-destructive hover:bg-destructive/10 transition-colors">
              Logout
            </button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
