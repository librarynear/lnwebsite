'use client'

import { useState } from "react"
import { CheckCircle2, ChevronRight } from "lucide-react"
import { approveReceptionPayment } from "@/app/actions/student-actions"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Link from "next/link"

export function DashboardPendingApprovals({ pendingApprovals }: { pendingApprovals: any[] }) {
  const [paymentApprovalId, setPaymentApprovalId] = useState<string | null>(null)
  const [approvalLoading, setApprovalLoading] = useState(false)

  return (
    <div className="bg-card rounded-2xl border border-warning shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-border flex justify-between items-center bg-warning/5">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-warning animate-pulse" />
          Pending Approvals
        </h2>
        <Link href="/dashboard/students" className="text-primary text-sm font-medium hover:underline">View All</Link>
      </div>
      <div className="p-6 flex-1 overflow-y-auto max-h-[350px]">
        <div className="space-y-4">
          {pendingApprovals.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No pending approvals!</div>
          ) : (
            pendingApprovals.map((booking, index) => (
              <div key={booking.id} className="flex justify-between items-center p-4 border border-border rounded-xl hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-sm font-bold text-foreground">#{index + 1}. {booking.student?.name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {booking.student?.phone || booking.student?.email}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-wider">
                    {booking.plan?.name} • ₹{booking.plan?.price}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => setPaymentApprovalId(booking.id)}
                  className="bg-warning text-warning-foreground hover:bg-warning/90 h-8 text-xs font-bold"
                >
                  Approve
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={!!paymentApprovalId} onOpenChange={(open) => !open && setPaymentApprovalId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Reception Payment</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            How did the student pay at the reception? This will mark their plan as active.
          </div>
          <div className="flex flex-col gap-3">
            <Button 
              onClick={async () => {
                if(paymentApprovalId && !approvalLoading) {
                  setApprovalLoading(true);
                  try {
                    await approveReceptionPayment(paymentApprovalId, "CASH");
                    toast.success("Payment approved successfully");
                    setPaymentApprovalId(null);
                  } catch (e: any) {
                    toast.error(e.message || "Failed to approve payment");
                  } finally {
                    setApprovalLoading(false);
                  }
                }
              }} 
              className="w-full bg-primary"
              disabled={approvalLoading}
            >
              {approvalLoading ? "Approving..." : "Paid via Cash"}
            </Button>
            <Button 
              onClick={async () => {
                if(paymentApprovalId && !approvalLoading) {
                  setApprovalLoading(true);
                  try {
                    await approveReceptionPayment(paymentApprovalId, "ONLINE");
                    toast.success("Payment approved successfully");
                    setPaymentApprovalId(null);
                  } catch (e: any) {
                    toast.error(e.message || "Failed to approve payment");
                  } finally {
                    setApprovalLoading(false);
                  }
                }
              }} 
              variant="outline" 
              className="w-full"
              disabled={approvalLoading}
            >
              {approvalLoading ? "Approving..." : "Paid via UPI/Card at Reception"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
