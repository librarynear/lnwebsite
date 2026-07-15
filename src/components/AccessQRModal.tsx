"use client";

import { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Loader2 } from "lucide-react";
import { generateEntryQR } from "@/app/actions/hardware-actions";

export function AccessQRModal({ libraryId, iconOnly }: { libraryId: string; iconOnly?: boolean }) {
  const [qrData, setQrData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Refresh QR code every 20 seconds while modal is open since TTL is 30s
  useEffect(() => {
    if (!open) return;

    const fetchQR = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await generateEntryQR(libraryId);
        if (res.error) {
          setError(res.error);
        } else if (res.qrPayload) {
          setQrData(res.qrPayload);
        }
      } catch {
        setError("Failed to generate secure QR");
      } finally {
        setLoading(false);
      }
    };

    fetchQR();
    const interval = setInterval(fetchQR, 20000);

    return () => clearInterval(interval);
  }, [open, libraryId]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setQrData(null);
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
            Show Access QR
          </Button>
        )
      } />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Library Access QR</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-6">
          {loading && !qrData ? (
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p>Generating secure access code...</p>
            </div>
          ) : error ? (
            <div className="text-center text-red-500 bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="font-semibold">Access Denied</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          ) : qrData ? (
            <div className="flex flex-col items-center gap-6">
              <div className="bg-white p-4 rounded-xl shadow-sm border">
                <QRCode value={qrData} size={256} />
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Hold this QR code up to the scanner at the door. <br/>
                <span className="text-xs font-semibold text-primary">Automatically refreshes every 20 seconds.</span>
              </p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
