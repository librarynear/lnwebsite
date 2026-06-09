import Link from "next/link";
import { Calendar as CalendarIcon, Clock, CreditCard, Wallet } from "lucide-react";

export default function BookingCheckoutPage({ params }: { params: { id: string } }) {
  // Dummy grid for MVP visualization
  const rows = 5;
  const cols = 8;
  const seats = Array.from({ length: rows * cols }, (_, i) => {
    const x = i % cols;
    const y = Math.floor(i / cols);
    const id = `${String.fromCharCode(65 + y)}${x + 1}`;
    // Randomize types for demo
    const isReserved = (x === 2 && y === 1) || (x === 4 && y === 3);
    const isNonReservable = (x === 7);
    return { id, x, y, isReserved, isNonReservable };
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <Link href={`/library/${params.id}`} className="text-primary hover:underline text-sm font-medium mb-4 inline-block">
          &larr; Back to Library
        </Link>
        <h1 className="text-4xl font-heading font-bold text-foreground">Book a Seat</h1>
        <p className="text-muted-foreground mt-1">Select your preferred seat, plan, and date.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Seat Map */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <h2 className="text-xl font-bold text-foreground">Seat Map</h2>
              <div className="flex flex-wrap gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded-full bg-background border border-border"></div> Available</div>
                <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded-full bg-primary"></div> Selected</div>
                <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded-full bg-muted"></div> Reserved</div>
              </div>
            </div>

            <div className="bg-muted/30 p-8 rounded-xl overflow-x-auto border border-border/50">
              <div className="min-w-max flex flex-col gap-3 items-center">
                {Array.from({ length: rows }).map((_, y) => (
                  <div key={y} className="flex gap-3">
                    {seats.filter(s => s.y === y).map(seat => {
                      let bgClass = "bg-background hover:border-primary cursor-pointer shadow-sm";
                      let textClass = "text-foreground";
                      if (seat.isReserved) {
                        bgClass = "bg-muted cursor-not-allowed opacity-50";
                        textClass = "text-muted-foreground";
                      } else if (seat.isNonReservable) {
                        bgClass = "bg-destructive/5 cursor-not-allowed border-dashed";
                        textClass = "text-destructive";
                      } else if (seat.id === "C4") { // Mock selected
                        bgClass = "bg-primary border-primary shadow-md";
                        textClass = "text-primary-foreground";
                      }

                      return (
                        <div 
                          key={seat.id} 
                          className={`w-12 h-12 rounded-xl border border-border flex items-center justify-center font-bold text-sm transition-all ${bgClass} ${textClass}`}
                        >
                          {seat.id}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
              <div className="mt-8 text-center text-muted-foreground text-sm tracking-widest uppercase font-bold">
                Front Desk
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Checkout Options */}
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h2 className="text-xl font-bold text-foreground mb-4">Plan Details</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Date</label>
                <div className="relative">
                  <input type="date" className="w-full px-4 py-2.5 rounded-lg border border-border bg-input/50 focus:outline-none focus:ring-2 focus:ring-ring text-foreground font-medium" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Select Plan</label>
                <select className="w-full px-4 py-2.5 rounded-lg border border-border bg-input/50 focus:outline-none focus:ring-2 focus:ring-ring text-foreground font-medium appearance-none">
                  <option>Daily Fixed ($5)</option>
                  <option>6-Hour Flexible ($3)</option>
                  <option>Monthly Fixed ($120)</option>
                </select>
              </div>

              <hr className="border-border my-4" />
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="border border-primary bg-primary/5 rounded-xl p-3 flex flex-col items-center gap-2 cursor-pointer transition-colors relative overflow-hidden">
                    <input type="radio" name="payment" className="absolute opacity-0" defaultChecked />
                    <CreditCard className="w-6 h-6 text-primary" />
                    <span className="text-sm font-bold text-primary">Pay Online</span>
                  </label>
                  <label className="border border-border bg-background rounded-xl p-3 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 transition-colors relative overflow-hidden">
                    <input type="radio" name="payment" className="absolute opacity-0" />
                    <Wallet className="w-6 h-6 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Reception</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex justify-between items-center text-lg">
                <span className="font-medium text-foreground">Total</span>
                <span className="font-bold text-3xl text-foreground">$5.00</span>
              </div>
              <Link href="/student/dashboard" className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity text-lg shadow-sm flex items-center justify-center">
                Confirm Booking
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
