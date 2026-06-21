'use client'

import { useState, useEffect, useRef, useCallback } from "react"
import { MapPin, Star, Check, Loader2, ArrowLeft, Clock, Phone, Navigation, Lock, Grid, X, ChevronLeft, ChevronRight, Share, Heart } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LibraryPhotoGallery } from "@/components/library-photo-gallery"
import { InquiryForm } from "./InquiryForm";
import dynamic from "next/dynamic"
import { auth } from "@/lib/firebase/clientApp"

import { useRealtimeSeats } from "@/hooks/useRealtimeSeats";
import { toast } from "react-hot-toast"
// Seat map pulls in react-zoom-pan-pinch; load it only when the section renders
// so it stays out of the initial library-page bundle.
const LiveSeatMap = dynamic(() => import("@/components/LiveSeatMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 w-full rounded-xl bg-muted animate-pulse">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
})
export function LibraryClient({ library, occupiedSeatIds: initialOccupiedSeatIds, studentId: initialStudentId, currentPlanEndDate: initialCurrentPlanEndDate, studentPhone: initialStudentPhone, studentEmail: initialStudentEmail }: { library: any, occupiedSeatIds: string[], studentId: string, currentPlanEndDate?: string | null, studentPhone?: string, studentEmail?: string }) {
  const router = useRouter();
  const [selectedSeat, setSelectedSeat] = useState<any | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [planFilter, setPlanFilter] = useState<number | null | "ALL">("ALL");
  
  const [selectedStandaloneLockerId, setSelectedStandaloneLockerId] = useState<string>("");
  
  const realtimeOccupiedSeatIds = useRealtimeSeats(library.id, initialOccupiedSeatIds);
  
  const [paymentMode, setPaymentMode] = useState<"ONLINE" | "RECEPTION">("ONLINE");
  
  // Feedback State
  const [feedbackType, setFeedbackType] = useState<"FEEDBACK" | "COMPLAINT" | null>(null);
  const [feedbackContent, setFeedbackContent] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Dynamic Session State
  const [dynamicState, setDynamicState] = useState({
    occupiedSeatIds: initialOccupiedSeatIds,
    occupiedLockerIds: [] as string[],
    studentId: initialStudentId,
    currentPlanEndDate: initialCurrentPlanEndDate,
    studentPhone: initialStudentPhone || "",
    studentEmail: initialStudentEmail || "",
    isLoading: true,
    hasError: false
  });

  const loadDynamicData = useCallback(() => {
    setDynamicState(s => ({ ...s, isLoading: true, hasError: false }));
    fetch(`/api/library/dynamic-data?libraryId=${library.id}`)
      .then(res => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setDynamicState({
          occupiedSeatIds: data.occupiedSeatIds || [],
          occupiedLockerIds: data.occupiedLockerIds || [],
          studentId: data.session?.userId || "",
          currentPlanEndDate: data.currentPlanEndDate || null,
          studentPhone: data.session?.phone || "",
          studentEmail: data.session?.email || "",
          isLoading: false,
          hasError: false
        });
      })
      .catch(e => {
        // Surface the failure instead of silently showing every seat as free
        // (which would let a user pick a taken seat and hit a 409 at checkout).
        console.error("Failed to fetch dynamic library data:", e);
        setDynamicState(s => ({ ...s, occupiedSeatIds: [], occupiedLockerIds: [], isLoading: false, hasError: true }));
      });
  }, [library.id]);

  useEffect(() => {
    loadDynamicData();
  }, [loadDynamicData]);

  const handleFeedbackSubmit = async () => {
    if (!dynamicState.studentId) {
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
  const checkoutLockRef = useRef(false);
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
        const monthlyPlans = library.plans.filter((p: any) => p.validityDays >= 28);
        const plansToUse = monthlyPlans.length > 0 ? monthlyPlans : library.plans;
        const minPrice = plansToUse && plansToUse.length > 0 
          ? Math.min(...plansToUse.map((p: any) => p.price)) 
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
      
    const lockerMonths = Math.max(1, Math.round(selectedPlan.validityDays / 28));

    if (seatHasMandatoryLocker) {
      hasLockerIncluded = true;
      lockerCost = (selectedSeat.lockerPriceMonthly || 0) * lockerMonths;
    } else if (selectedStandaloneLockerId) {
      hasLockerIncluded = true;
      const locker = library.standaloneLockers.find((l:any) => l.id === selectedStandaloneLockerId);
      if (locker) {
        lockerCost = locker.price * lockerMonths;
      }
    }
  }

  const totalAmount = planPrice + lockerCost;

  let startDate = new Date();
  if (dynamicState.currentPlanEndDate) {
    startDate = new Date(dynamicState.currentPlanEndDate);
  }
  let endDate = new Date(startDate);
  if (selectedPlan) {
    endDate.setDate(endDate.getDate() + selectedPlan.validityDays - 1);
  }

  const executeCheckout = async (idToken?: string) => {
    if (!selectedPlan) {
      toast.error("Please select a plan.");
      return;
    }
    
    if (!isFlexible && !selectedSeat) {
      toast.error("Please select a seat for this Fixed plan.");
      return;
    }

    checkoutLockRef.current = true;
    setIsProcessing(true);

    if (paymentMode === "RECEPTION") {
      try {
        const res = await fetch('/api/checkout/reception', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: dynamicState.studentId,
            libraryId: library.id,
            seatId: isFlexible ? null : selectedSeat.id,
            planId: selectedPlan.id,
            hasLocker: seatHasMandatoryLocker,
            standaloneLockerId: !seatHasMandatoryLocker && selectedStandaloneLockerId ? selectedStandaloneLockerId : null,
            idToken
          })
        });
        const data = await res.json();
        if (data.success) {
          toast.success("Booking requested! Please pay at the reception to confirm your seat.");
          setShowSuccessModal(true);
        } else {
          toast.error(data.error || "Failed to initiate booking");
        }
      } catch (e) {
        toast.error("An error occurred during booking");
      } finally {
        setIsProcessing(false);
        checkoutLockRef.current = false;
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
          standaloneLockerId: !seatHasMandatoryLocker && selectedStandaloneLockerId ? selectedStandaloneLockerId : null,
          idToken
        })
      });
      const data = await orderRes.json();

      if (!data.payment_url) {
        throw new Error(data.error || "Failed to create payment");
      }

      window.location.href = data.payment_url;
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Error initiating checkout");
      setIsProcessing(false);
      checkoutLockRef.current = false;
    }
  };

  const handleCheckout = async () => {
    if (checkoutLockRef.current) return;
    
    const user = auth.currentUser;
    if (!dynamicState.studentId && !user) {
      const isEmbed = new URLSearchParams(window.location.search).get('embed') === 'true';
      if (isEmbed) {
        // Use popup for iframes to bypass third-party cookie blocking
        const width = 400;
        const height = 650;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        window.open('/login?popup=true', 'Login', `width=${width},height=${height},top=${top},left=${left}`);
        
        const listener = (e: MessageEvent) => {
          if (e.data?.type === 'LOGIN_SUCCESS') {
            window.removeEventListener('message', listener);
            executeCheckout(e.data.token);
          }
        };
        window.addEventListener('message', listener);
        return;
      }

      const retUrl = isEmbed ? `/library/${library.id}?embed=true` : `/library/${library.id}`;
      router.push(`/login?returnUrl=${encodeURIComponent(retUrl)}`);
      return;
    }
    const idToken = user ? await user.getIdToken() : undefined;
    executeCheckout(idToken);
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

  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => {
        const url = '/student/dashboard?booking=success';
        try {
          if (window.top !== window.self) window.top!.location.href = url;
          else window.location.href = url;
        } catch(e) { window.location.href = url; }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

  return (
    <div className="min-h-screen bg-background pb-32">
      
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border shadow-2xl rounded-3xl p-8 max-w-sm w-full text-center space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-heading font-black text-foreground">Booking Confirmed!</h2>
            <p className="text-muted-foreground">Your seat has been successfully reserved. You are being redirected to your bookings page...</p>
            <button 
              onClick={() => {
                const url = '/student/dashboard?booking=success';
                try {
                  if (window.top !== window.self) window.top!.location.href = url;
                  else window.location.href = url;
                } catch(e) { window.location.href = url; }
              }}
              className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity mt-4"
            >
              Go to My Bookings
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
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 library-gallery">
        <LibraryPhotoGallery images={photos} libraryName={library.name} />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 flex flex-col lg:grid lg:grid-cols-3 gap-y-12 lg:gap-x-12 relative">
        
        {/* Left Column 1: About */}
        <div className="order-1 lg:col-span-2 lg:col-start-1 lg:row-start-1 space-y-12 about-section">
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
        <div className="order-2 lg:order-none lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:row-span-2 booking-widget-container" id="booking-widget">
          <div className="relative lg:sticky lg:top-8 bg-card border border-border shadow-2xl rounded-3xl p-6 space-y-6">
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
                  <LiveSeatMap 
                    library={library}
                    occupiedSeatIds={realtimeOccupiedSeatIds}
                    interactive={true}
                    selectedSeat={selectedSeat}
                    compactMode={true}
                    onSeatSelect={(seat) => {
                      setSelectedSeat(seat);
                      if (seat.hasLocker) {
                        setSelectedStandaloneLockerId("");
                      }
                      setTimeout(() => {
                        const widget = document.getElementById('payment-section');
                        if (widget) window.scrollTo({top: widget.getBoundingClientRect().top + window.pageYOffset - 100, behavior: 'smooth'});
                      }, 100);
                    }}
                  />
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
                        <p className="text-xs text-foreground/80">
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
                  <span className="text-foreground/70 text-xs uppercase tracking-wider font-bold mb-1">Valid From</span>
                  <span className="text-foreground">{startDate.toLocaleDateString()}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider font-bold mb-1">Valid Till</span>
                  <span className="text-foreground">{endDate.toLocaleDateString()}</span>
                </div>
              </div>
            )}

            {/* Dynamic Load State Overlay */}
            {dynamicState.isLoading && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-3xl">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            {/* Live availability failed to load — block checkout instead of risking a taken seat */}
            {dynamicState.hasError && !dynamicState.isLoading && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                <span>Couldn&apos;t load live seat availability.</span>
                <button
                  onClick={loadDynamicData}
                  className="shrink-0 rounded-lg bg-destructive/20 px-3 py-1.5 font-bold hover:bg-destructive/30 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            <button 
              onClick={handleCheckout}
              disabled={!selectedPlan || (!isFlexible && !selectedSeat) || isProcessing || dynamicState.isLoading || dynamicState.hasError}
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
          <hr className="border-border hidden lg:block facilities-section" />

          {/* Facilities */}
          <section className="facilities-section">
            <h2 className="text-2xl font-bold font-heading tracking-tight mb-6">What this place offers</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-8">
              {library.facilities.map((fac: string) => (
                <div key={fac} className="flex items-center gap-3 text-foreground font-medium text-sm">
                  <Check className="w-5 h-5 text-primary shrink-0" /> {fac}
                </div>
              ))}
            </div>
          </section>

          <hr className="border-border location-section" />

          {/* Map Location */}
          <section className="location-section">
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
                className="grayscale hover:grayscale-0 transition-all duration-700"
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

          <section className="mt-8 border-t border-border pt-8 feedback-section">
            <h2 className="text-2xl font-black text-foreground mb-4 font-heading flex items-center gap-2">
              Feedback & Support
            </h2>
            <div className="flex gap-4">
              <button 
                onClick={() => {
                  if(!dynamicState.studentId) {
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
                  if(!dynamicState.studentId) {
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

          <hr className="border-border inquiry-section" />

          {/* Contact / Inquiry */}
          <section className="inquiry-section">
            <InquiryForm libraryId={library.id} />
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
            ₹{(() => {
              const monthlyPlans = library.plans.filter((p: any) => p.validityDays >= 28);
              const plansToUse = monthlyPlans.length > 0 ? monthlyPlans : library.plans;
              return plansToUse?.length > 0 ? Math.min(...plansToUse.map((p: any) => p.price)) : 0;
            })()} 
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
            disabled={isProcessing || dynamicState.isLoading || dynamicState.hasError}
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
