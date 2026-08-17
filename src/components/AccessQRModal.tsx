"use client";

import { useState, useEffect, useRef } from "react";
import QRCode from "react-qr-code";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Loader2, CheckCircle2 } from "lucide-react";
import { generateEntryQR } from "@/app/actions/hardware-actions";
import { motion, AnimatePresence } from "framer-motion";

import confetti from "canvas-confetti";

import { supabase } from "@/lib/supabase-client";

export function AccessQRModal({ libraryId, studentId, iconOnly, isCheckedIn: initialIsCheckedIn }: { libraryId: string; studentId: string; iconOnly?: boolean; isCheckedIn?: boolean }) {
  const [qrData, setQrData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(initialIsCheckedIn ?? false);
  const [showSuccess, setShowSuccess] = useState(false);

  const qrDataRef = useRef<string | null>(null);
  const isCheckedInRef = useRef(isCheckedIn);

  // Sync ref with state
  useEffect(() => {
    isCheckedInRef.current = isCheckedIn;
  }, [isCheckedIn]);

  const triggerSuccess = (newStatus: boolean) => {
    setShowSuccess(true);
    
    // Single satisfying vibration
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([200]);
    }
    
    // Confetti burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#22c55e', '#3b82f6', '#f59e0b']
    });

    setTimeout(() => {
      setOpen(false);
      setShowSuccess(false);
      setIsCheckedIn(newStatus);
    }, 3000);
  };

  // Real-time listener for instant feedback
  useEffect(() => {
    if (!open || !studentId) return;

    const channel = supabase
      .channel('checkin-logs-modal')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'CheckinLog', filter: `studentId=eq.${studentId}` },
        (payload) => {
          const newStatus = payload.new.status === 'CHECK_IN';
          if (newStatus !== isCheckedInRef.current && qrDataRef.current) {
            triggerSuccess(newStatus);
          }
        }
      )
      .subscribe((status, err) => {
        if (err) console.error("Supabase realtime error:", err);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, studentId]);

  // Generate secure QR payload
  useEffect(() => {
    if (!open) return;

    const fetchQR = async () => {
      // Don't poll if we're already showing success
      if (showSuccess) return;
      
      if (!qrDataRef.current) setLoading(true);
      setError(null);
      try {
        const res = await generateEntryQR(libraryId);
        if (res.error) {
          setError(res.error);
        } else if (res.qrPayload) {
          // Fallback check (in case realtime failed)
          if (res.isCheckedIn !== undefined && res.isCheckedIn !== isCheckedInRef.current && qrDataRef.current && !showSuccess) {
            triggerSuccess(res.isCheckedIn);
          } else {
            qrDataRef.current = res.qrPayload;
            setQrData(res.qrPayload);
            // Sync the initial check-in state silently on load
            if (res.isCheckedIn !== undefined && res.isCheckedIn !== isCheckedInRef.current) {
              setIsCheckedIn(res.isCheckedIn);
            }
          }
        }
      } catch {
        setError("Failed to generate secure QR");
      } finally {
        setLoading(false);
      }
    };

    fetchQR();
    // 20 second refresh for security and fallback polling
    const interval = setInterval(fetchQR, 20000);

    return () => clearInterval(interval);
  }, [open, libraryId, showSuccess]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQrData(null);
      qrDataRef.current = null;
      setShowSuccess(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={
        iconOnly ? (
          <Button variant="ghost" className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full flex-shrink-0 text-foreground hover:bg-muted">
            <QrCode size={24} strokeWidth={2.5} className="!w-6 !h-6" />
          </Button>
        ) : (
          <Button variant="outline" className="gap-2 w-full sm:w-auto">
            <QrCode className="w-4 h-4" />
            {isCheckedIn ? "Check-out QR" : "Check-in QR"}
          </Button>
        )
      } />
      <DialogContent className="sm:max-w-md border-border/50 shadow-xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center font-heading text-xl">
            {isCheckedIn ? "Library Check-out" : "Library Check-in"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-8">
          {loading && !qrData ? (
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="animate-pulse">Generating secure access code...</p>
            </div>
          ) : error ? (
            <div className="text-center text-red-500 bg-red-50/50 p-4 rounded-xl border border-red-200">
              <p className="font-bold">Access Denied</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          ) : showSuccess ? (
            <motion.div 
              initial={{ scale: 0.5, rotateY: 180, opacity: 0 }} 
              animate={{ scale: 1, rotateY: 0, opacity: 1 }} 
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="flex flex-col items-center gap-5 py-6 text-center"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-success/20 blur-xl rounded-full" />
                <CheckCircle2 className="w-24 h-24 text-success relative z-10 drop-shadow-md" />
              </div>
              <div>
                <p className="text-2xl font-black text-foreground mb-2">
                  {isCheckedIn ? "Checked Out!" : "Checked In!"}
                </p>
                <p className="text-muted-foreground font-medium">
                  {isCheckedIn ? "See you next time." : "Have a great session."}
                </p>
              </div>
            </motion.div>
          ) : qrData ? (
            <div className="flex flex-col items-center gap-6">
              
              {/* Prominent Status Badge */}
              <div className={`px-6 py-2.5 rounded-full font-bold text-lg shadow-sm border ${
                isCheckedIn 
                  ? 'bg-amber-50 text-amber-600 border-amber-200' 
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200'
              }`}>
                {isCheckedIn ? "CHECK-OUT QR" : "CHECK-IN QR"}
              </div>

              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-2 ${
                  isCheckedIn ? 'border-amber-100' : 'border-emerald-100'
                }`}
              >
                <QRCode 
                  value={qrData} 
                  size={240} 
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }} 
                  fgColor={isCheckedIn ? "#d97706" : "#059669"} // amber-600 or emerald-600
                />
              </motion.div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-foreground text-lg">Scan at Reception</p>
                <p className="text-sm text-muted-foreground px-4">
                  Show this code at the scanner to check {isCheckedIn ? "out of" : "into"} the library.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
