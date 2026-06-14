'use client'

import { useOptimistic, useTransition } from "react"
import { pauseBooking, resumeBooking } from "@/app/actions/booking-actions"
import { Button } from "@/components/ui/button"
import { PauseCircle, PlayCircle } from "lucide-react"

export default function PauseResumeButton({ 
  bookingId, 
  isPaused, 
  pausedAt 
}: { 
  bookingId: string, 
  isPaused: boolean, 
  pausedAt: Date | null 
}) {
  const [isPending, startTransition] = useTransition()
  
  const [optimisticIsPaused, addOptimisticToggle] = useOptimistic(
    isPaused,
    (state: boolean, newIsPaused: boolean) => newIsPaused
  )

  const handleToggle = async () => {
    if (!optimisticIsPaused) {
      if (!confirm("Are you sure you want to pause your plan? It will only be extended if you keep it paused for more than 7 days.")) {
        return;
      }
    }

    startTransition(async () => {
      const intendedState = !optimisticIsPaused;
      addOptimisticToggle(intendedState);
      
      try {
        if (intendedState === false) { 
          const res = await resumeBooking(bookingId)
          if (res.success) {
            if (res.extendedDays > 0) {
              alert(`Plan resumed! Your plan was automatically extended by ${res.extendedDays} days.`)
            } else {
              alert(`Plan resumed! Since you paused for less than 7 days, your plan end date was not extended.`)
            }
          }
        } else {
          await pauseBooking(bookingId)
        }
      } catch (err: any) {
        alert(err.message || "Something went wrong")
      }
    });
  }

  return (
    <Button 
      variant={optimisticIsPaused ? "default" : "outline"} 
      size="sm" 
      onClick={handleToggle}
      disabled={isPending}
      className={`font-bold transition-all ${optimisticIsPaused ? 'bg-success hover:bg-success/90 text-success-foreground' : 'text-warning border-warning hover:bg-warning/10'}`}
    >
      {optimisticIsPaused ? (
        <><PlayCircle className="w-4 h-4 mr-2" /> Resume Plan</>
      ) : (
        <><PauseCircle className="w-4 h-4 mr-2" /> Pause Plan</>
      )}
    </Button>
  )
}
