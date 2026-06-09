'use client'

import { useState } from "react"
import { Search, UserPlus, MoreVertical, ChevronDown } from "lucide-react"
import { addStudentWithBooking } from "@/app/actions/student-actions"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function StudentsClient({ bookings, plans }: { bookings: any[], plans: any[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")

  async function handleAdd(formData: FormData) {
    await addStudentWithBooking(formData)
    setIsOpen(false)
  }

  const filteredBookings = bookings.filter(b => 
    b.student.name.toLowerCase().includes(search.toLowerCase()) ||
    b.student.uniqueId.toLowerCase().includes(search.toLowerCase()) ||
    (b.student.phone && b.student.phone.includes(search))
  )

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Students</h1>
          <p className="text-muted-foreground mt-1">Manage active, inactive, and new enrollments.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger className="bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm cursor-pointer">
            <UserPlus className="w-4 h-4" /> Add Student
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Enroll New Student</DialogTitle>
            </DialogHeader>
            <form action={handleAdd} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" placeholder="e.g. John Doe" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="john@example.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" name="phone" placeholder="+1 234 567 8900" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="planId">Assign Plan</Label>
                <Select name="planId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name} (₹{p.price})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full">Create & Assign Plan</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 md:p-6 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center bg-muted/20">
          <div className="relative w-full md:w-96">
            <input 
              type="text" 
              placeholder="Search by name, ID, or phone..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-input/50 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-foreground"
            />
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="p-4 text-xs uppercase tracking-wider font-bold text-muted-foreground">ID</th>
                <th className="p-4 text-xs uppercase tracking-wider font-bold text-muted-foreground">Student</th>
                <th className="p-4 text-xs uppercase tracking-wider font-bold text-muted-foreground">Current Plan</th>
                <th className="p-4 text-xs uppercase tracking-wider font-bold text-muted-foreground">Status</th>
                <th className="p-4 text-xs uppercase tracking-wider font-bold text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredBookings.length > 0 ? (
                filteredBookings.map(booking => (
                  <tr key={booking.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <span className="font-mono text-sm font-bold bg-muted px-2 py-1 rounded border border-border/50">{booking.student.uniqueId}</span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-foreground">{booking.student.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{booking.student.phone}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-foreground">{booking.plan.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Until {new Date(booking.endTime).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${booking.status === 'CONFIRMED' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 bg-background border border-border hover:bg-muted rounded-lg transition-colors text-foreground font-medium text-sm focus:outline-none">
                          Manage <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 p-2">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator className="mb-2" />
                            <DropdownMenuItem className="cursor-pointer p-2.5 text-sm font-medium rounded-md hover:bg-muted">View Profile</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer p-2.5 text-sm font-medium rounded-md hover:bg-muted mt-1">Extend Plan</DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator className="my-2" />
                          <DropdownMenuItem className="text-destructive cursor-pointer p-2.5 text-sm font-medium rounded-md hover:bg-destructive/10">Revoke Access</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No active students found in Supabase database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
