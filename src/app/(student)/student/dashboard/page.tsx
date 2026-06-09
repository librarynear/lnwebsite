import { Calendar, Clock, MapPin, User as UserIcon } from "lucide-react";

export default function StudentDashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-4xl font-heading font-bold text-foreground mb-8">My Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <UserIcon className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">John Doe</h2>
                <p className="text-muted-foreground">Student</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">FocusDesk ID</p>
                <div className="bg-muted px-4 py-2 rounded-lg font-mono font-bold text-lg tracking-widest text-center text-foreground border border-border/50">
                  A9X3B2
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Show this ID to the librarian for manual bookings
                </p>
              </div>
              
              <hr className="border-border" />
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium text-foreground">john@example.com</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium text-foreground">+1 234 567 8900</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings Section */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Bookings */}
          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-4">Active Bookings</h2>
            
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm border-l-4 border-l-success">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-success/10 text-success text-xs font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">Confirmed</span>
                    <span className="text-sm text-muted-foreground">Fixed Plan</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Central City Library</h3>
                  <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
                    <MapPin className="w-4 h-4" /> Downtown Metro Station
                  </div>
                </div>
                <div className="bg-muted px-4 py-3 rounded-xl text-center min-w-[120px]">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Seat</p>
                  <p className="text-2xl font-bold text-primary">A-12</p>
                </div>
              </div>
              
              <hr className="border-border my-4" />
              
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2 text-foreground">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="font-medium">Today, June 4th</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="font-medium">08:00 AM - 10:00 PM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Past Bookings */}
          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-4">Past Bookings</h2>
            
            <div className="space-y-4">
              <div className="bg-card rounded-xl border border-border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-75">
                <div>
                  <h3 className="font-bold text-foreground">Tech Study Space</h3>
                  <div className="flex items-center gap-4 text-sm mt-1">
                    <span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> May 28th</span>
                    <span className="text-muted-foreground flex items-center gap-1">Seat B-05</span>
                  </div>
                </div>
                <button className="text-sm font-medium text-primary hover:underline self-start sm:self-center">
                  Leave a Review
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
