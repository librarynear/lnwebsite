"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

function readStoredPhoneDraft(storageKey?: string) {
  if (!storageKey || typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw
      ? (JSON.parse(raw) as {
          phone?: string;
          whatsapp?: string;
          sameAsPhone?: boolean;
        })
      : null;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

export function PhoneWhatsappFields({
  initialPhone = "",
  initialWhatsapp = "",
  storageKey,
  clearOnMount = false,
}: {
  initialPhone?: string;
  initialWhatsapp?: string;
  storageKey?: string;
  clearOnMount?: boolean;
}) {
  const storedDraft = !clearOnMount ? readStoredPhoneDraft(storageKey) : null;
  const [phone, setPhone] = useState(storedDraft?.phone ?? initialPhone);
  const [whatsapp, setWhatsapp] = useState(storedDraft?.whatsapp ?? initialWhatsapp);
  const [sameAsPhone, setSameAsPhone] = useState(
    storedDraft?.sameAsPhone ?? (Boolean(initialPhone) && initialPhone === initialWhatsapp),
  );

  useEffect(() => {
    if (storageKey && clearOnMount) {
      window.localStorage.removeItem(storageKey);
    }
  }, [clearOnMount, storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ phone, whatsapp, sameAsPhone }),
    );
  }, [phone, sameAsPhone, storageKey, whatsapp]);

  const effectiveWhatsapp = sameAsPhone ? phone : whatsapp;

  return (
    <>
      <div className="space-y-2">
        <label htmlFor="phone_number" className="text-sm font-medium text-black">
          Phone <span className="text-destructive">*</span>
        </label>
        <Input
          id="phone_number"
          name="phone_number"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="10-digit mobile number"
          className="rounded-2xl border-border/80 bg-slate-50/50 shadow-sm focus-visible:ring-primary/30"
          required
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="whatsapp_number" className="text-sm font-medium text-black">
          WhatsApp
        </label>
        <Input
          id="whatsapp_number"
          name="whatsapp_number"
          value={effectiveWhatsapp}
          onChange={(event) => setWhatsapp(event.target.value)}
          className="rounded-2xl border-border/80 bg-slate-50/50 shadow-sm focus-visible:ring-primary/30"
          disabled={sameAsPhone}
        />
        {sameAsPhone ? (
          <input type="hidden" name="whatsapp_number" value={phone} readOnly />
        ) : null}
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={sameAsPhone}
            onChange={(event) => setSameAsPhone(event.target.checked)}
          />
          Same as phone number
        </label>
      </div>
    </>
  );
}
