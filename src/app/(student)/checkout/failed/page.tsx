'use client'

import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CheckoutFailedPage() {
  const router = useRouter();

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 text-center shadow-xl">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-destructive" />
        </div>
        
        <h1 className="text-3xl font-heading font-black text-foreground mb-3">
          Payment Failed
        </h1>
        <p className="text-muted-foreground mb-8">
          We couldn't process your payment. Don't worry, no money was deducted from your account. Please check your payment details or try a different method.
        </p>

        <div className="flex flex-col gap-3">
          <button 
            onClick={() => router.back()}
            className="w-full bg-primary text-primary-foreground font-bold text-lg py-4 rounded-xl hover:opacity-90 transition-opacity flex justify-center items-center gap-2 shadow-md"
          >
            <RefreshCw className="w-5 h-5" /> Try Again
          </button>
          
          <Link 
            href="/libraries" 
            className="w-full bg-transparent border-2 border-border text-foreground font-bold text-lg py-3.5 rounded-xl hover:bg-muted transition-colors flex justify-center items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" /> Back to Search
          </Link>
        </div>
      </div>
    </div>
  );
}
