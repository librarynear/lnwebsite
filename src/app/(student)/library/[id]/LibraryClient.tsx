'use client'

import { useState, useEffect } from "react"
import { MapPin, Star, Check, Loader2, ArrowLeft, Clock, Phone, Navigation, Lock, Grid, X, ChevronLeft, ChevronRight, Share, Heart } from "lucide-react"
import Link from "next/link"
import Script from "next/script"
import { useRouter } from "next/navigation"
import { LibraryPhotoGallery } from "@/components/library-photo-gallery"
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch"

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function LibraryClient({ library, occupiedSeatIds, studentId, currentPlanEndDate, studentPhone, studentEmail }: { library: any, occupiedSeatIds: string[], studentId: string, currentPlanEndDate?: string | null, studentPhone?: string, studentEmail?: string }) {
  const router = useRouter();
  const [selectedSeat, setSelectedSeat] = useState<any | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [planFilter, setPlanFilter] = useState<number | null | "ALL">("ALL");
  
  const [selectedStandaloneLockerId, setSelectedStandaloneLockerId] = useState<string>("");
  
  const [paymentMode, setPaymentMode] = useState<"ONLINE" | "RECEPTION">("ONLINE");
  
  // Feedback State
  const [feedbackType, setFeedbackType] = useState<"FEEDBACK" | "COMPLAINT" | null>(null);
  const [feedbackContent, setFeedbackContent] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const handleFeedbackSubmit = async () => {
    if (!studentId) {
      router.push(`/login?returnUrl=/library/${library.id}`);
      return;
    }
    if (!feedbackContent.trim()) return;
    
    setIsSubmittingFeedback(true);
    try {
      const res = await fetch('/api/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          libraryId: library.id,
          type: feedbackType,
          content: feedbackContent
        })
      });
      if (!res.ok) throw new Error("Failed to submit");
      alert("Submitted successfully!");
      setFeedbackType(null);
      setFeedbackContent("");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Derive recommended plans based on the selected plan's duration
  const recommendedPlans = selectedPlan 
    ? library.plans.filter((p: any) => p.durationHours === selectedPlan.durationHours && p.id !== selectedPlan.id)
    : [];

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
        const minPrice = library.plans && library.plans.length > 0 
          ? Math.min(...library.plans.map((p: any) => p.price)) 
          : 0;

        savedLibraries.push({
          id: library.id,
          name: library.name,
          locality: library.locality || library.address.split(',')[0],
          city: library.city,
          metroStation: library.metroStation,
          metroDistance: library.metroDistance,
          minPrice: minPrice,
          imageUrl: library.photos?.[0] || null
        });
        setIsSaved(true);
      }
      localStorage.setItem('savedLibraries', JSON.stringify(savedLibraries));
      window.dispatchEvent(new Event("savedLibrariesUpdated"));
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

  let startDate = new Date();
  if (currentPlanEndDate) {
    startDate = new Date(currentPlanEndDate);
  }
  let endDate = new Date(startDate);
  if (selectedPlan) {
    endDate.setDate(endDate.getDate() + selectedPlan.validityDays);
  }

  const handleCheckout = async () => {
    if (!studentId) {
      router.push(`/login?returnUrl=/library/${library.id}`);
      return;
    }
    if (!selectedPlan) {
      alert("Please select a plan.");
      return;
    }
    
    if (!isFlexible && !selectedSeat) {
      alert("Please select a seat for this Fixed plan.");
      return;
    }

    setIsProcessing(true);

    if (paymentMode === "RECEPTION") {
      try {
        const res = await fetch('/api/checkout/reception', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId,
            libraryId: library.id,
            seatId: isFlexible ? null : selectedSeat.id,
            planId: selectedPlan.id,
            hasLocker: seatHasMandatoryLocker,
            standaloneLockerId: !seatHasMandatoryLocker && selectedStandaloneLockerId ? selectedStandaloneLockerId : null
          })
        });
        const data = await res.json();
        if (data.success) {
          setShowSuccessModal(true);
        } else {
          alert(data.error || "Failed to initiate booking");
        }
      } catch (e) {
        alert("An error occurred during booking");
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    try {
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          planId: selectedPlan.id,
          seatId: isFlexible ? null : selectedSeat.id,
          hasLocker: seatHasMandatoryLocker,
          standaloneLockerId: !seatHasMandatoryLocker && selectedStandaloneLockerId ? selectedStandaloneLockerId : null
        })
      });
      const orderData = await orderRes.json();

      if (!orderData.id) throw new Error("Failed to create order");

      // Use callback_url instead of handler so the flow survives UPI
      // intent redirects (which destroy the in-page JS context). Razorpay
      // POSTs the payment details to this URL after a successful payment,
      // and the server creates the booking + redirects to the dashboard.
      const callbackUrl = `${window.location.origin}/api/razorpay/callback`;

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: "INR",
        name: library.name,
        description: isFlexible ? `Booking Flexible Plan - ${selectedPlan.name}` : `Booking Seat ${selectedSeat.name} - ${selectedPlan.name}`,
        order_id: orderData.id,
        callback_url: callbackUrl,
        redirect: true,
        prefill: {
          name: "Student",
          email: studentEmail || "guest@focusdesk.in",
          contact: studentPhone ? (studentPhone.startsWith('+') ? studentPhone : `+91${studentPhone.replace(/\D/g, '').slice(-10)}`) : "+919876543210",
          method: "upi"
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay via UPI",
                instruments: [{ method: "upi" }]
              }
            },
            sequence: ["block.upi"],
            preferences: { show_default_blocks: true }
          }
        },
        theme: {
          color: "#7C2C2E"
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
            import('react-hot-toast').then(({ default: toast }) => {
              toast.error("Payment cancelled");
            });
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any){
        setIsProcessing(false);
        alert("Payment failed. Please try again.");
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
      
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border shadow-2xl rounded-3xl p-8 max-w-sm w-full text-center space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-heading font-black text-foreground">Booking Confirmed!</h2>
            <p className="text-muted-foreground">Your seat has been successfully reserved. You can view all details in your dashboard.</p>
            <button 
              onClick={() => router.push('/student/dashboard')}
              className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity mt-4"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
      
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

      {/* Top Full Width Photos */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
        <LibraryPhotoGallery images={photos} libraryName={library.name} />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 flex flex-col lg:grid lg:grid-cols-3 gap-y-12 lg:gap-x-12 relative">
        
        {/* Left Column 1: About */}
        <div className="order-1 lg:col-span-2 lg:col-start-1 lg:row-start-1 space-y-12">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold font-heading tracking-tight">About</h2>
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
        </div>

        {/* Right Column: Sticky Booking Widget */}
        <div className="order-2 lg:order-none lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:row-span-2" id="booking-widget">
          <div className="lg:sticky lg:top-8 bg-card border border-border shadow-2xl rounded-3xl p-6 space-y-6">
            <h3 className="text-2xl font-black font-heading tracking-tight text-foreground">
              {selectedPlan ? (
                <span>₹{totalAmount.toFixed(0)}</span>
              ) : (
                "Select a plan"
              )}
            </h3>

            <div className="space-y-3" id="plans-section">
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
                          setSelectedSeat(null);
                          setTimeout(() => {
                            const widget = document.getElementById('payment-section');
                            if (widget) window.scrollTo({top: widget.getBoundingClientRect().top + window.pageYOffset - 100, behavior: 'smooth'});
                          }, 100);
                        } else {
                          setTimeout(() => {
                            const widget = document.getElementById('seat-section');
                            if (widget) window.scrollTo({top: widget.getBoundingClientRect().top + window.pageYOffset - 100, behavior: 'smooth'});
                          }, 100);
                        }
                      }}
                      className={`p-4 border-2 rounded-2xl cursor-pointer transition-all ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-border/80'}`}
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
              
              {/* Recommendations */}
              {selectedPlan && recommendedPlans.length > 0 && (
                <div className="pt-4 border-t border-border mt-4">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 block">
                    Recommended Upgrades ({selectedPlan.durationHours ? `${selectedPlan.durationHours} hr` : 'Full Day'})
                  </label>
                  <div className="space-y-2">
                    {recommendedPlans.map((plan: any) => {
                      const finalPrice = plan.discount ? plan.price - (plan.price * plan.discount / 100) : plan.price;
                      return (
                        <div 
                          key={plan.id} 
                          onClick={() => {
                            setSelectedPlan(plan);
                            if (plan.type === "FLEXIBLE") {
                              setSelectedSeat(null);
                              setTimeout(() => {
                                const widget = document.getElementById('payment-section');
                                if (widget) window.scrollTo({top: widget.getBoundingClientRect().top + window.pageYOffset - 100, behavior: 'smooth'});
                              }, 100);
                            } else {
                              setTimeout(() => {
                                const widget = document.getElementById('seat-section');
                                if (widget) window.scrollTo({top: widget.getBoundingClientRect().top + window.pageYOffset - 100, behavior: 'smooth'});
                              }, 100);
                            }
                          }}
                          className={`p-4 border-2 rounded-2xl cursor-pointer transition-all border-border hover:border-primary/50 bg-muted/20 hover:bg-primary/5`}
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
                  </div>
                </div>
              )}
            </div>

            {/* Seat Selection Inline */}
            {selectedPlan && !isFlexible && (
              <>
                <div className="space-y-3 pt-4 border-t border-border" id="seat-section">
                  <label className="text-sm font-bold text-foreground flex justify-between items-center">
                    <span>2. Select a Seat</span>
                  </label>
                </div>
                <div className="mt-2">
                  <div className="bg-muted/30 border border-border rounded-2xl p-0 overflow-hidden relative">
                  <div className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm text-[10px] text-muted-foreground px-2 py-1 rounded-full border border-border font-bold flex items-center gap-1">
                    <Grid className="w-3 h-3" /> Pinch to Zoom
                  </div>
                  <TransformWrapper
                    initialScale={1}
                    minScale={0.5}
                    maxScale={3}
                    centerOnInit={true}
                    wheel={{ step: 0.1 }}
                  >
                    <TransformComponent wrapperClass="!w-full !h-[300px] cursor-grab active:cursor-grabbing">
                      <div className="w-full h-full p-8 flex items-center justify-center">
                        <div className="w-max mx-auto flex flex-col gap-3 transition-transform duration-500 ease-out">
                          {Array.from({ length: maxY + 1 }).map((_, y) => (
                            <div key={y} className="flex gap-3">
                              {Array.from({ length: maxX + 1 }).map((_, x) => {
                                const seat = library.seats.find((s:any) => s.gridX === x && s.gridY === y);
                                if (!seat) return <div key={x} className="w-10 h-10"></div>;

                                const isOccupied = occupiedSeatIds.includes(seat.id);
                                const isSelected = selectedSeat?.id === seat.id;
                                
                                let seatClass = "bg-background border-border hover:border-primary cursor-pointer text-foreground shadow-[2px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[4px_8px_0px_0px_rgba(0,0,0,0.1)] hover:-translate-y-2";
                                
                                const isDisabled = isOccupied || seat.type === 'NON_RESERVABLE';

                                if (isDisabled) {
                                  seatClass = "bg-muted border-border/50 text-muted-foreground opacity-50 cursor-not-allowed shadow-none";
                                } else if (isSelected) {
                                  seatClass = "bg-primary border-primary text-primary-foreground shadow-[2px_8px_0px_0px_rgba(0,0,0,0.2)] -translate-y-2";
                                }

                                return (
                                  <div 
                                    key={seat.id} 
                                    onClick={() => {
                                      if (!isDisabled) {
                                        setSelectedSeat(seat);
                                        if (seat.hasLocker) {
                                          setSelectedStandaloneLockerId("");
                                        }
                                        setTimeout(() => {
                                          const widget = document.getElementById('payment-section');
                                          if (widget) window.scrollTo({top: widget.getBoundingClientRect().top + window.pageYOffset - 100, behavior: 'smooth'});
                                        }, 100);
                                      }
                                    }}
                                    className={`relative w-10 h-10 rounded-lg border-2 flex items-center justify-center font-bold text-xs transition-all duration-300 ${seatClass}`}
                                  >
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      {seat.name}
                                    </div>
                                    {seat.hasLocker && (
                                      <div className="absolute -top-3 -right-2 bg-foreground text-background p-0.5 rounded-full shadow-lg z-10">
                                        <Lock className="w-2.5 h-2.5" />
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          ))}
                          <div className="mt-4 mx-auto w-full text-center py-1.5 bg-border/50 rounded-md text-muted-foreground text-[10px] tracking-widest uppercase font-bold border border-border">
                            Front Desk
                          </div>
                        </div>
                      </div>
                    </TransformComponent>
                  </TransformWrapper>
                </div>
              </div>
              </>
            )}

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
                          Included with this seat.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm text-foreground">Optional Locker</span>
                          {selectedStandaloneLockerId && <span className="font-bold text-sm text-primary">+₹{lockerCost.toFixed(0)}</span>}
                        </div>
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

            {/* Payment Method Toggle */}
            <div className="space-y-3 pt-4 border-t border-border" id="payment-section">
              <label className="text-sm font-bold text-foreground">3. Payment Method</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentMode("ONLINE")}
                  className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all border-2 ${paymentMode === "ONLINE" ? 'bg-primary/10 border-primary text-primary' : 'bg-background border-border text-muted-foreground hover:border-border/80'}`}
                >
                  Pay Online
                </button>
                <button
                  onClick={() => setPaymentMode("RECEPTION")}
                  className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all border-2 ${paymentMode === "RECEPTION" ? 'bg-primary/10 border-primary text-primary' : 'bg-background border-border text-muted-foreground hover:border-border/80'}`}
                >
                  Pay at Reception
                </button>
              </div>
            </div>

            {selectedPlan && (
              <div className="flex justify-between items-center text-sm font-medium mt-4 bg-muted/30 p-4 rounded-xl border border-border">
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider font-bold mb-1">Valid From</span>
                  <span className="text-foreground">{startDate.toLocaleDateString()}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider font-bold mb-1">Valid Till</span>
                  <span className="text-foreground">{endDate.toLocaleDateString()}</span>
                </div>
              </div>
            )}

            <button 
              onClick={handleCheckout}
              disabled={!selectedPlan || (!isFlexible && !selectedSeat) || isProcessing}
              className="w-full bg-primary text-primary-foreground font-bold text-lg py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg mt-4"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {isProcessing ? "Processing..." : (paymentMode === "ONLINE" ? `Pay ₹${totalAmount.toFixed(0)}` : `Book for ₹${totalAmount.toFixed(0)}`)}
            </button>
            
            <p className="text-center text-xs text-muted-foreground">
              {paymentMode === "ONLINE" ? "Secure payments by Razorpay." : "Your booking will be confirmed after payment at reception."}
            </p>
          </div>
        </div>

        {/* Left Column 2: Facilities & Map */}
        <div className="order-3 lg:order-none lg:col-span-2 lg:col-start-1 lg:row-start-2 space-y-12">
          <hr className="border-border hidden lg:block" />

          {/* Facilities */}
          <section>
            <h2 className="text-2xl font-bold font-heading tracking-tight mb-6">What this place offers</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-8">
              {library.facilities.map((fac: string) => (
                <div key={fac} className="flex items-center gap-3 text-foreground font-medium text-sm">
                  <Check className="w-5 h-5 text-primary shrink-0" /> {fac}
                </div>
              ))}
            </div>
          </section>

          <hr className="border-border" />

          {/* Map Location */}
          <section>
            <h2 className="text-2xl font-bold font-heading tracking-tight mb-6">Location</h2>
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

          <section className="mt-8 border-t border-border pt-8">
            <h2 className="text-2xl font-black text-foreground mb-4 font-heading flex items-center gap-2">
              Feedback & Support
            </h2>
            <div className="flex gap-4">
              <button 
                onClick={() => {
                  if(!studentId) {
                    router.push(`/login?returnUrl=/library/${library.id}`);
                    return;
                  }
                  setFeedbackType("FEEDBACK");
                }}
                className="flex-1 bg-muted/50 hover:bg-muted text-foreground py-4 rounded-xl font-bold text-sm border border-border transition-colors"
              >
                💡 Give Suggestion
              </button>
              <button 
                onClick={() => {
                  if(!studentId) {
                    router.push(`/login?returnUrl=/library/${library.id}`);
                    return;
                  }
                  setFeedbackType("COMPLAINT");
                }}
                className="flex-1 bg-destructive/10 hover:bg-destructive/20 text-destructive py-4 rounded-xl font-bold text-sm border border-destructive/20 transition-colors"
              >
                ⚠️ File Complaint
              </button>
            </div>
          </section>

        </div>
      </div>

      {feedbackType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-foreground">
              {feedbackType === "FEEDBACK" ? "Give Suggestion" : "File Complaint"}
            </h3>
            <textarea 
              value={feedbackContent}
              onChange={(e) => setFeedbackContent(e.target.value)}
              placeholder={`Write your ${feedbackType.toLowerCase()} here...`}
              className="w-full h-32 p-3 border border-border rounded-lg bg-input/50 focus:outline-none focus:ring-2 focus:ring-primary mb-4 resize-none text-foreground"
            ></textarea>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => { setFeedbackType(null); setFeedbackContent(""); }}
                className="px-4 py-2 font-bold text-muted-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleFeedbackSubmit}
                disabled={isSubmittingFeedback || !feedbackContent.trim()}
                className="px-4 py-2 font-bold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSubmittingFeedback ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4 z-40 flex justify-between items-center shadow-[0_-4px_20px_-1px_rgba(0,0,0,0.1)]">
        <div>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Starting from</div>
          <div className="text-lg font-black text-foreground">
            ₹{library.plans?.length > 0 ? Math.min(...library.plans.map((p: any) => p.price)) : 0} 
            <span className="text-sm font-medium text-muted-foreground font-sans"> / month</span>
          </div>
        </div>
        {!selectedPlan ? (
          <button 
            onClick={() => {
              const widget = document.getElementById('plans-section');
              if (widget) {
                const yOffset = -100; 
                const y = widget.getBoundingClientRect().top + window.pageYOffset + yOffset;
                window.scrollTo({top: y, behavior: 'smooth'});
              } else {
                window.scrollTo({top: 0, behavior: 'smooth'});
              }
            }} 
            className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-xl hover:opacity-90 shadow-lg"
          >
            Select Plan
          </button>
        ) : (!isFlexible && !selectedSeat) ? (
          <button 
            onClick={() => {
              const widget = document.getElementById('seat-section');
              if (widget) {
                const yOffset = -100; 
                const y = widget.getBoundingClientRect().top + window.pageYOffset + yOffset;
                window.scrollTo({top: y, behavior: 'smooth'});
              }
              import('react-hot-toast').then(({ default: toast }) => {
                toast("Please select a seat first", { icon: "💺" });
              });
            }} 
            className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-xl hover:opacity-90 shadow-lg"
          >
            Select Seat
          </button>
        ) : (
          <button 
            onClick={handleCheckout}
            disabled={isProcessing}
            className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-xl hover:opacity-90 shadow-lg flex items-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isProcessing ? "Processing..." : "Pay Now"}
          </button>
        )}
      </div>

    </div>
  )
}
