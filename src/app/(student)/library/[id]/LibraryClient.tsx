'use client'

import { useState, useEffect } from "react"
import { MapPin, Star, Check, Loader2, ArrowLeft, Clock, Phone, Navigation, Lock, Grid, X, ChevronLeft, ChevronRight, Share, Heart } from "lucide-react"
import Link from "next/link"
import Script from "next/script"
import { useRouter } from "next/navigation"

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function LibraryClient({ library, occupiedSeatIds, studentId }: { library: any, occupiedSeatIds: string[], studentId: string }) {
  const router = useRouter();
  const [selectedSeat, setSelectedSeat] = useState<any | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [planFilter, setPlanFilter] = useState<number | null | "ALL">("ALL");
  
  const [selectedStandaloneLockerId, setSelectedStandaloneLockerId] = useState<string>("");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    try {
      const savedLibraries = JSON.parse(localStorage.getItem('savedLibraries') || '[]');
      setIsSaved(savedLibraries.some((l: any) => l.id === library.id));
    } catch (e) {}
  }, [library.id]);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: library.name,
          text: `Check out ${library.name} on Library Near!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const handleSave = () => {
    try {
      let savedLibraries = JSON.parse(localStorage.getItem('savedLibraries') || '[]');
      if (isSaved) {
        savedLibraries = savedLibraries.filter((l: any) => l.id !== library.id);
        setIsSaved(false);
      } else {
        savedLibraries.push({
          id: library.id,
          name: library.name,
          locality: library.locality,
          city: library.city,
          imageUrl: library.photos?.[0] || null
        });
        setIsSaved(true);
      }
      localStorage.setItem('savedLibraries', JSON.stringify(savedLibraries));
    } catch (e) {
      console.error('Error saving:', e);
    }
  };
  // Using the prop passed from the server side.

  const isFlexible = selectedPlan?.type === "FLEXIBLE";
  const seatHasMandatoryLocker = !isFlexible && selectedSeat?.hasLocker === true;
  
  // Calculate Prices
  let planPrice = 0;
  let lockerCost = 0;
  let hasLockerIncluded = false;
  
  if (selectedPlan) {
    planPrice = selectedPlan.discount 
      ? selectedPlan.price - (selectedPlan.price * selectedPlan.discount / 100) 
      : selectedPlan.price;
      
    if (seatHasMandatoryLocker) {
      hasLockerIncluded = true;
      lockerCost = (selectedSeat.lockerPriceMonthly || 0) * (selectedPlan.validityDays / 28);
    } else if (selectedStandaloneLockerId) {
      hasLockerIncluded = true;
      const locker = library.standaloneLockers.find((l:any) => l.id === selectedStandaloneLockerId);
      if (locker) {
        lockerCost = locker.price * (selectedPlan.validityDays / 28);
      }
    }
  }

  const totalAmount = planPrice + lockerCost;

  const handleCheckout = async () => {
    if (!selectedPlan || !studentId) {
      alert("Please select a plan, and ensure you are 'logged in' as a student.");
      return;
    }
    
    if (!isFlexible && !selectedSeat) {
      alert("Please select a seat for this Fixed plan.");
      return;
    }

    setIsProcessing(true);
    try {
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        body: JSON.stringify({ amount: totalAmount })
      });
      const orderData = await orderRes.json();

      if (!orderData.id) throw new Error("Failed to create order");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: "INR",
        name: library.name,
        description: isFlexible ? `Booking Flexible Plan - ${selectedPlan.name}` : `Booking Seat ${selectedSeat.name} - ${selectedPlan.name}`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                studentId,
                libraryId: library.id,
                seatId: isFlexible ? null : selectedSeat.id,
                planId: selectedPlan.id,
                amount: totalAmount,
                hasLocker: seatHasMandatoryLocker, // only true if physical seat has it
                standaloneLockerId: !seatHasMandatoryLocker && selectedStandaloneLockerId ? selectedStandaloneLockerId : null
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              alert("Payment Successful! Booking Confirmed.");
              router.push("/libraries");
            } else {
              alert("Payment verification failed.");
            }
          } catch (e) {
            alert("Error verifying payment.");
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: "Test Student",
          email: "student@example.com",
          contact: "9999999999"
        },
        theme: {
          color: "#7C2C2E"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any){
        alert("Payment Failed: " + response.error.description);
        setIsProcessing(false);
      });
      rzp.open();

    } catch (error) {
      console.error(error);
      alert("Error initiating checkout");
      setIsProcessing(false);
    }
  }

  // Compute unique hours for filters
  const availableHours = Array.from(new Set(library.plans.map((p:any) => p.durationHours)))
    .sort((a:any, b:any) => {
      if (a === null) return 1;
      if (b === null) return -1;
      return a - b;
    });

  const filteredPlans = library.plans.filter((p:any) => planFilter === "ALL" || p.durationHours === planFilter);

  const maxX = library.seats.length > 0 ? Math.max(...library.seats.map((s:any) => s.gridX)) : 0;
  const maxY = library.seats.length > 0 ? Math.max(...library.seats.map((s:any) => s.gridY)) : 0;

  // Setup photos array
  let photos = library.photos || [];
  if (photos.length === 0) {
    photos = [
      "https://images.unsplash.com/photo-1568667256549-094345857637?w=1200&q=80",
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
      "https://images.unsplash.com/photo-1510531704581-5b28709e5a16?w=800&q=80"
    ];
  }

  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(library.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="min-h-screen bg-background pb-32">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8">
        <div className="text-sm font-medium text-muted-foreground mb-4">
          Home / {library.city} / <span className="text-foreground font-bold">{library.name}</span>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-4xl font-heading font-bold text-foreground mb-3">{library.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-muted-foreground">
              {(library.name === "Kripa Library" || library.name === "Gyan Vatika Library") && (
                <span className="flex items-center gap-1 text-success bg-success/10 px-2 py-0.5 rounded text-xs border border-success/20"><Check className="w-3 h-3" /> Verified</span>
              )}
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {library.locality || library.address.split(',')[0]} {library.metroStation ? `· ${library.metroDistance} km from ${library.metroStation}` : ''}</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {library.openingTime || "08:00"} – {library.closingTime || "22:00"}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={handleShare} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-bold text-foreground hover:bg-muted transition-colors">
              <Share className="w-4 h-4" /> Share
            </button>
            <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-bold text-foreground hover:bg-muted transition-colors">
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-foreground text-foreground' : ''}`} /> {isSaved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          {/* Lightbox Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
            <div>
              <div className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-0.5">Photo Tour</div>
              <div className="text-lg font-bold font-heading text-foreground">{library.name}</div>
            </div>
            <button 
              onClick={() => setLightboxOpen(false)}
              className="p-2 rounded-full border border-border text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Lightbox Content */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left side (Main image) */}
            <div className="flex-1 relative flex items-center justify-center p-4 lg:p-12 bg-muted/10">
              <button 
                onClick={() => setLightboxIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))}
                className="absolute left-4 lg:left-8 z-10 bg-background border border-border text-foreground p-2 lg:p-3 rounded-full hover:bg-muted transition-colors shadow-sm"
              >
                <ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>

              <img 
                src={photos[lightboxIndex]} 
                alt="Zoomed Library" 
                className="max-h-full max-w-full rounded-2xl object-contain select-none shadow-sm"
              />

              <button 
                onClick={() => setLightboxIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))}
                className="absolute right-4 lg:right-8 z-10 bg-background border border-border text-foreground p-2 lg:p-3 rounded-full hover:bg-muted transition-colors shadow-sm"
              >
                <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>

              <div className="absolute bottom-6 lg:bottom-12 bg-background/90 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-foreground shadow-sm">
                {lightboxIndex + 1} / {photos.length}
              </div>
            </div>

            {/* Right side (Thumbnails sidebar) */}
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border/40 bg-card/30 p-6 overflow-y-auto">
              <h3 className="font-bold text-sm text-foreground mb-4">All photos</h3>
              <div className="grid grid-cols-4 lg:grid-cols-2 gap-3">
                {photos.map((photo: string, idx: number) => (
                  <div 
                    key={idx}
                    onClick={() => setLightboxIndex(idx)}
                    className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all ${idx === lightboxIndex ? 'ring-2 ring-foreground ring-offset-2' : 'hover:opacity-80'}`}
                  >
                    <img src={photo} className="w-full h-full object-cover" alt={`Thumbnail ${idx + 1}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-12">
          
          {/* Gallery Moved Here */}
          <div className="relative group">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 aspect-[4/3] md:aspect-[16/9] rounded-2xl overflow-hidden bg-muted/10">
              {/* Main large photo (left side) */}
              <div 
                className={`relative cursor-pointer hover:opacity-90 transition-opacity ${photos.length >= 2 ? 'md:col-span-2' : 'col-span-1 md:col-span-4'}`}
                onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
              >
                <img src={photos[0]} className="w-full h-full object-cover" alt="Library Main" />
              </div>

              {/* Smaller stacked photos (right side) */}
              {photos.length >= 2 && (
                <div className="hidden md:grid col-span-2 grid-rows-2 gap-2 h-full">
                  <div 
                    className="relative cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => { setLightboxIndex(1); setLightboxOpen(true); }}
                  >
                    <img src={photos[1]} className="w-full h-full object-cover" alt="Library secondary" />
                  </div>
                  {photos.length >= 3 ? (
                    <div 
                      className="relative cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => { setLightboxIndex(2); setLightboxOpen(true); }}
                    >
                      <img src={photos[2]} className="w-full h-full object-cover" alt="Library tertiary" />
                    </div>
                  ) : (
                    <div className="relative bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground text-sm font-medium">No more photos</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <button 
              onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
              className="absolute bottom-4 right-4 bg-background text-foreground px-4 py-2 rounded-lg font-bold text-sm shadow-md border border-border flex items-center gap-2 hover:bg-muted transition-colors z-10"
            >
              <Grid className="w-4 h-4" /> Show all photos
            </button>
          </div>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold font-heading">About</h2>
            <div className="flex flex-wrap gap-4 text-sm font-medium text-muted-foreground bg-muted/30 p-4 rounded-xl border border-border">
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary" /> {library.openingTime || "08:00"} - {library.closingTime || "22:00"}</span>
              {library.managerPhone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-primary" /> {library.managerPhone}</span>}
              {library.seatsAvailable && <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> {library.seatsAvailable} Seats Available</span>}
            </div>
            {library.description && (
              <p className="text-foreground leading-relaxed">
                {library.description}
              </p>
            )}
          </section>

          <hr className="border-border" />

          {/* Facilities */}
          <section>
            <h2 className="text-2xl font-bold font-heading mb-6">What this place offers</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-8">
              {library.facilities.map((fac: string) => (
                <div key={fac} className="flex items-center gap-3 text-foreground font-medium text-sm">
                  <Check className="w-5 h-5 text-primary shrink-0" /> {fac}
                </div>
              ))}
            </div>
          </section>

          <hr className="border-border" />

          {/* Seat Selection */}
          <section>
            <h2 className="text-2xl font-bold font-heading mb-6">Select your seat</h2>
            
            {!selectedPlan ? (
              <div className="bg-muted/30 border border-border rounded-3xl p-8 text-center text-muted-foreground">
                Please select a plan first to see available seats.
              </div>
            ) : isFlexible ? (
              <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 text-center text-foreground font-medium flex flex-col items-center gap-2">
                <Check className="w-8 h-8 text-primary" />
                Flexible Plans do not require a specific seat assignment.
                <p className="text-sm text-muted-foreground font-normal">You can skip seat selection and proceed to checkout!</p>
              </div>
            ) : (
              <div className="bg-muted/30 border border-border rounded-3xl p-6 overflow-auto">
                <div className="w-max mx-auto flex flex-col gap-3">
                  {Array.from({ length: maxY + 1 }).map((_, y) => (
                    <div key={y} className="flex gap-3">
                      {Array.from({ length: maxX + 1 }).map((_, x) => {
                        const seat = library.seats.find((s:any) => s.gridX === x && s.gridY === y);
                        if (!seat) return <div key={x} className="w-12 h-12"></div>;

                        const isOccupied = occupiedSeatIds.includes(seat.id);
                        const isSelected = selectedSeat?.id === seat.id;
                        
                        let seatClass = "bg-background border-border hover:border-primary cursor-pointer text-foreground";
                        
                        // Rule: Students with a Fixed (Reserved) plan can ONLY pick seats explicitly marked as 'RESERVED'.
                        // They cannot pick 'NORMAL' or 'NON_RESERVABLE' seats.
                        const isDisabled = isOccupied || seat.type !== 'RESERVED';

                        if (isDisabled) {
                          seatClass = "bg-muted border-border/50 text-muted-foreground opacity-50 cursor-not-allowed";
                        } else if (isSelected) {
                          seatClass = "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20";
                        }

                        return (
                          <div 
                            key={seat.id} 
                            onClick={() => {
                              if (!isDisabled) {
                                setSelectedSeat(seat);
                                // If they pick a seat with a mandatory locker, clear the standalone locker selection
                                if (seat.hasLocker) {
                                  setSelectedStandaloneLockerId("");
                                }
                              }
                            }}
                            className={`relative w-12 h-12 rounded-xl border-2 flex items-center justify-center font-bold text-sm transition-all shadow-sm ${seatClass}`}
                          >
                            {seat.name}
                            {seat.hasLocker && (
                              <div className="absolute -top-2 -right-2 bg-foreground text-background p-0.5 rounded-full shadow-sm">
                                <Lock className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                  <div className="mt-6 mx-auto w-full text-center py-2 bg-border/50 rounded-lg text-muted-foreground text-xs tracking-widest uppercase font-bold border border-border shadow-sm">
                    Front Desk / Entrance
                  </div>
                  
                  <div className="mt-4 flex gap-4 justify-center text-xs font-medium text-muted-foreground">
                     <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm border border-border bg-background"></div> Available</span>
                     <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm border border-border bg-primary ring-2 ring-primary/20"></div> Selected</span>
                     <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm border border-border bg-muted"></div> Occupied</span>
                     <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-foreground" /> Has Locker</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          <hr className="border-border" />

          {/* Map Location */}
          <section>
            <h2 className="text-2xl font-bold font-heading mb-6">Location</h2>
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <iframe 
                src={mapEmbedUrl} 
                width="100%" 
                height="350" 
                style={{ border: 0 }} 
                allowFullScreen={false} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-bold text-foreground text-sm">{library.address}</h3>
                  <p className="text-muted-foreground text-xs mt-1">{library.locality}, {library.city}</p>
                </div>
                <a 
                  href={library.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(library.address)}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold text-sm shrink-0 flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                >
                  <Navigation className="w-4 h-4" /> Get Directions
                </a>
              </div>
            </div>
          </section>

        </div>

        {/* Sticky Booking Widget */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 bg-card border border-border shadow-2xl rounded-3xl p-6 space-y-6">
            <h3 className="text-2xl font-black font-heading text-foreground">
              {selectedPlan ? (
                <span>₹{totalAmount.toFixed(0)}</span>
              ) : (
                "Select a plan"
              )}
            </h3>

            <div className="space-y-3">
              <label className="text-sm font-bold text-foreground flex items-center justify-between">
                <span>1. Choose a Plan</span>
              </label>

              {/* Filters */}
              <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none">
                <button 
                  onClick={() => setPlanFilter("ALL")}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${planFilter === "ALL" ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  All Plans
                </button>
                {availableHours.map((hr: any) => (
                  <button 
                    key={hr === null ? "FULL" : hr}
                    onClick={() => setPlanFilter(hr)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${planFilter === hr ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                  >
                    {hr === null ? "Full Day" : `${hr} hr`}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                {filteredPlans.map((plan: any) => {
                  const isSelected = selectedPlan?.id === plan.id;
                  const finalPrice = plan.discount ? plan.price - (plan.price * plan.discount / 100) : plan.price;
                  return (
                    <div 
                      key={plan.id} 
                      onClick={() => {
                        setSelectedPlan(plan);
                        if (plan.type === "FLEXIBLE") {
                          setSelectedSeat(null); // Clear seat if switching to flexible
                        }
                      }}
                      className={`p-4 border-2 rounded-2xl cursor-pointer transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80'}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-foreground">{plan.name}</span>
                        <span className="font-bold text-foreground">₹{finalPrice.toFixed(0)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{plan.validityDays} Days • {plan.durationHours ? `${plan.durationHours} hr access` : 'Full Day access'}</div>
                      {plan.discount && plan.discount > 0 && (
                        <div className="mt-2 text-[10px] font-bold text-success bg-success/10 px-2 py-1 rounded w-max">
                          {plan.discount}% OFF
                        </div>
                      )}
                    </div>
                  )
                })}
                {filteredPlans.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4">No plans found.</div>
                )}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
              <label className="text-sm font-bold text-foreground flex justify-between items-center">
                <span>2. Selected Seat</span>
                <span className="text-primary font-black bg-primary/10 px-2 py-1 rounded">
                  {isFlexible ? "FLEXIBLE" : (selectedSeat ? selectedSeat.name : "None")}
                </span>
              </label>
            </div>

            {/* Locker Add-on UI */}
            {selectedPlan && (seatHasMandatoryLocker || library.standaloneLockers?.length > 0) && (
              <div className={`p-4 rounded-xl border ${seatHasMandatoryLocker ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border'} space-y-3`}>
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <Lock className={`w-4 h-4 ${seatHasMandatoryLocker ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 space-y-2">
                    
                    {seatHasMandatoryLocker ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm text-foreground">Attached Locker</span>
                          <span className="font-bold text-sm">+₹{lockerCost.toFixed(0)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          This seat has a locker attached. The fee has been prorated and automatically added to your total.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm text-foreground">Optional Standalone Locker</span>
                          {selectedStandaloneLockerId && <span className="font-bold text-sm text-primary">+₹{lockerCost.toFixed(0)}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Secure your belongings by renting one of our standalone lockers.
                        </p>
                        
                        <select 
                          value={selectedStandaloneLockerId}
                          onChange={(e) => setSelectedStandaloneLockerId(e.target.value)}
                          className="w-full text-sm rounded-lg border border-border bg-background p-2 focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">No locker needed</option>
                          {library.standaloneLockers.map((locker: any) => (
                            <option key={locker.id} value={locker.id}>
                              {locker.name} - ₹{locker.price}/mo
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button 
              onClick={handleCheckout}
              disabled={!selectedPlan || (!isFlexible && !selectedSeat) || isProcessing}
              className="w-full bg-primary text-primary-foreground font-bold text-lg py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg mt-4"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {isProcessing ? "Processing..." : `Pay ₹${totalAmount.toFixed(0)}`}
            </button>
            
            <p className="text-center text-xs text-muted-foreground">You won't be charged yet. Secure payments by Razorpay.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
