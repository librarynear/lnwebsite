"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Phone, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { submitLead } from "@/app/actions/leads";

interface EnquiryFormProps {
  libraryBranchId: string;
  phoneNumber?: string | null;
  sourcePage?: string;
}

export function EnquiryForm({ libraryBranchId, phoneNumber, sourcePage }: EnquiryFormProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const phone = (form.elements.namedItem("phone") as HTMLInputElement).value;

    startTransition(async () => {
      const result = await submitLead({
        library_branch_id: libraryBranchId,
        name,
        phone_number: phone,
        source_page: sourcePage,
      });

      if (result.success) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
        setErrorMsg(result.error);
      }
    });
  }

  return (
    <div className="border-t border-border/50 pt-5">
      <p className="font-semibold mb-1">Enquire directly</p>
      <p className="text-xs text-muted-foreground mb-4">
        Leave your number and we&apos;ll connect you with this library.
      </p>

      {status === "success" ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
          <p className="font-semibold text-sm">Request received!</p>
          <p className="text-xs text-muted-foreground">We&apos;ll reach out to you shortly.</p>
          <button
            onClick={() => setStatus("idle")}
            className="mt-2 text-xs text-primary underline"
          >
            Submit another
          </button>
        </div>
      ) : (
        <form className="flex flex-col gap-2.5" onSubmit={handleSubmit}>
          <input
            name="name"
            type="text"
            placeholder="Your name"
            required
            disabled={isPending}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/60 disabled:opacity-60"
          />
          <input
            name="phone"
            type="tel"
            placeholder="10-digit mobile number"
            required
            disabled={isPending}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/60 disabled:opacity-60"
          />

          {status === "error" && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errorMsg}
            </div>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full font-semibold mt-1 rounded-lg"
          >
            {isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
            ) : (
              "Request Callback"
            )}
          </Button>
        </form>
      )}

      {phoneNumber && (
        <div className="mt-4 flex items-center justify-center">
          <a
            href={`tel:${phoneNumber}`}
            className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <Phone className="w-4 h-4" /> Call {phoneNumber}
          </a>
        </div>
      )}
    </div>
  );
}
