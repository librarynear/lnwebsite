"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type UploadState = "missing" | "uploading" | "failed" | "ready";

export function OwnerSubmissionSubmitButton({
  formId,
  className,
  children,
}: {
  formId: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  const [uploadState, setUploadState] = useState<UploadState>("missing");

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    const readState = () => {
      const input = form.querySelector<HTMLInputElement>('input[name="photo_upload_state"]');
      const nextState = (input?.value || "missing") as UploadState;
      setUploadState(nextState);
    };

    readState();
    form.addEventListener("input", readState);
    form.addEventListener("change", readState);
    form.addEventListener("owner-photo-upload-state-change", readState as EventListener);

    return () => {
      form.removeEventListener("input", readState);
      form.removeEventListener("change", readState);
      form.removeEventListener("owner-photo-upload-state-change", readState as EventListener);
    };
  }, [formId]);

  const disabled = pending || uploadState !== "ready";
  const label =
    pending
      ? "Submitting..."
      : uploadState === "uploading"
        ? "Uploading photos..."
        : uploadState === "failed"
          ? "Fix photo uploads"
          : uploadState === "missing"
            ? "Upload photos to continue"
            : children;

  return (
    <Button type="submit" disabled={disabled} aria-disabled={disabled} className={className}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}
