import { CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 text-center shadow-xl">
        <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-success" />
        </div>
        
        <h1 className="text-3xl font-heading font-black text-foreground mb-3">
          Payment Successful!
        </h1>
        <p className="text-muted-foreground mb-8">
          Your booking has been confirmed. A receipt has been sent to your email. You can now view your active bookings and library access details on your dashboard.
        </p>

        <Link 
          href="/student/dashboard" 
          className="w-full bg-primary text-primary-foreground font-bold text-lg py-4 rounded-xl hover:opacity-90 transition-opacity flex justify-center items-center gap-2 shadow-md"
        >
          Go to My Dashboard <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}
