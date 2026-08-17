"use client";

import { useState, useEffect, useRef } from "react";
import QRCode from "react-qr-code";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Loader2, CheckCircle2 } from "lucide-react";
import { generateEntryQR } from "@/app/actions/hardware-actions";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

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
  const [firstIn, setFirstIn] = useState<Date | null>(null);
  const [lastOut, setLastOut] = useState<Date | null>(null);
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
          if (res.firstIn) setFirstIn(new Date(res.firstIn));
          if (res.lastOut) setLastOut(new Date(res.lastOut));
          
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
      <DialogContent className="sm:max-w-md border-border/50 shadow-xl rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-center font-heading text-xl">
            {isCheckedIn ? "Library Check-out" : "Library Check-in"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-4">
          {loading && !qrData ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground animate-pulse">Generating Secure Code...</p>
            </div>
          ) : !qrData ? (
            <div className="py-8 flex flex-col items-center justify-center gap-4 bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
                <QrCode className="w-10 h-10 text-rose-500 opacity-50" />
                <div className="text-center">
                  <h3 className="font-bold text-slate-800 text-lg mb-1">{!studentId ? "Not Signed In" : "No Active Plan"}</h3>
                  <p className="text-sm text-slate-500 font-medium max-w-[250px] mx-auto">
                    {!studentId
                      ? "Please sign in to view your library access QR code."
                      : libraryId 
                        ? "Your plan has expired. Please renew your plan to generate an access QR code." 
                        : "You do not have an active booking at any library yet."}
                  </p>
                </div>
                {!studentId ? (
                  <Link href="/login" onClick={() => setOpen(false)} className="w-full">
                    <Button className="w-full h-12 rounded-xl text-[15px] font-bold mt-2 shadow-sm">
                      Sign In
                    </Button>
                  </Link>
                ) : libraryId ? (
                  <Link href={`/library/${libraryId}/book`} onClick={() => setOpen(false)} className="w-full">
                    <Button className="w-full h-12 rounded-xl text-[15px] font-bold mt-2 shadow-sm">
                      Renew Plan
                    </Button>
                  </Link>
                ) : (
                  <Button className="flex-1 font-bold" onClick={() => { window.location.href = "/libraries"; }}>
                    Explore Libraries
                  </Button>
                )}
              </div>
          ) : showSuccess ? (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 gap-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center relative"
              >
                <div className="absolute inset-0 rounded-full border-4 border-success animate-ping opacity-20" />
                <CheckCircle2 className="w-12 h-12 text-success" />
              </motion.div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-foreground">
                  {isCheckedIn ? "Checked In!" : "Checked Out!"}
                </h3>
                <p className="text-muted-foreground font-medium">
                  {isCheckedIn ? "Have a productive session." : "See you next time!"}
                </p>
              </div>
            </motion.div>
          ) : qrData ? (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 flex flex-col items-center gap-6 w-full"
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-tr from-primary/10 to-transparent rounded-full blur-2xl -z-10" />
                <QRCode 
                  value={qrData} 
                  size={200}
                  level="Q"
                  className="rounded-lg shadow-sm" 
                  fgColor={isCheckedIn ? "#d97706" : "#059669"}
                />
                
                {/* Scanning animation overlay */}
                <div className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden">
                  <motion.div
                    animate={{ top: ["-10%", "110%"] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="absolute left-0 right-0 h-0.5 bg-primary/50 shadow-[0_0_8px_rgba(var(--primary),0.8)]"
                  />
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-bold text-slate-700">Scan at the reception tablet</p>
                <p className="text-xs font-semibold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                  Auto-refreshes every 20s
                </p>
              </div>

              {/* Today's Times */}
              <div className="w-full pt-4 border-t border-slate-100 flex flex-col gap-2">
                <div className="flex justify-between items-center px-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's First In</span>
                  <span className="text-sm font-bold text-slate-700">{firstIn ? firstIn.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                </div>
                <div className="flex justify-between items-center px-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Last Out</span>
                  <span className="text-sm font-bold text-slate-700">{lastOut ? lastOut.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : (isCheckedIn ? 'Still In' : '-')}</span>
                </div>
                <a href="/student/profile" className="text-center text-xs font-bold text-[#0085FF] hover:underline mt-2">View past check-ins</a>
              </div>
            </motion.div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
