"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type FormSubmitButtonProps = {
  children: ReactNode;
  className?: string;
};

export function FormSubmitButton({ children, className }: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className={className}
      aria-disabled={pending}
    >
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? "Submitting..." : children}
    </Button>
  );
}
