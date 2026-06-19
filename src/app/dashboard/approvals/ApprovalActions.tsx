"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Banknote, CreditCard, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function ApprovalActions({ bookingId }: { bookingId: string }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const handleApprove = async (method: "CASH" | "ONLINE_TRANSFER") => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/admin/booking/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, paymentMethod: method })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Booking approved and activated successfully!");
        router.refresh();
      } else {
        toast.error(data.error || "Failed to approve booking.");
      }
    } catch (e: any) {
      toast.error("An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!confirm("Are you sure you want to reject and cancel this pending request?")) return;
    setIsProcessing(true);
    try {
      const res = await fetch("/api/admin/booking/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Booking rejected.");
        router.refresh();
      } else {
        toast.error(data.error || "Failed to reject booking.");
      }
    } catch (e: any) {
      toast.error("An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleApprove("CASH")}
        disabled={isProcessing}
        className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-success/10 text-success hover:bg-success/20 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
      >
        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
        Approve (Cash)
      </button>
      <button
        onClick={() => handleApprove("ONLINE_TRANSFER")}
        disabled={isProcessing}
        className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
      >
        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
        Approve (Online)
      </button>
      <button
        onClick={handleReject}
        disabled={isProcessing}
        className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
      >
        <XCircle className="w-4 h-4" />
        Reject
      </button>
    </div>
  );
}
