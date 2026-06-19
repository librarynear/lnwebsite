'use client'

import { useOptimistic, useTransition } from "react"
import { pauseBooking, resumeBooking } from "@/app/actions/booking-actions"
import { Button } from "@/components/ui/button"
import { PauseCircle, PlayCircle } from "lucide-react"
import { toast } from "react-hot-toast"

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

  const executeToggle = () => {
    startTransition(async () => {
      const intendedState = !optimisticIsPaused;
      addOptimisticToggle(intendedState);
      
      try {
        if (intendedState === false) { 
          const res = await resumeBooking(bookingId)
          if (res.success) {
            if (res.extendedDays > 0) {
              toast.success(`Plan resumed! Your plan was automatically extended by ${res.extendedDays} days.`, { duration: 5000 })
            } else {
              toast.success(`Plan resumed! Since you paused for less than 7 days, your plan end date was not extended.`, { duration: 5000 })
            }
          }
        } else {
          await pauseBooking(bookingId)
          toast.success("Plan paused successfully.")
        }
      } catch (err: any) {
        addOptimisticToggle(!intendedState);
        toast.error(err.message || "Something went wrong")
      }
    });
  };

  const handleToggle = async () => {
    if (!optimisticIsPaused) {
      toast((t) => (
        <div className="flex flex-col gap-3">
          <p className="font-medium text-sm text-foreground">Are you sure you want to pause your plan? It will only be extended if you keep it paused for more than 7 days.</p>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => toast.dismiss(t.id)}>Cancel</Button>
            <Button size="sm" variant="default" onClick={() => {
              toast.dismiss(t.id);
              executeToggle();
            }}>Pause Plan</Button>
          </div>
        </div>
      ), { duration: Infinity });
      return;
    }

    executeToggle();
  }

  return (
    <Button 
      variant="ghost"
      onClick={handleToggle}
      disabled={isPending}
      className={`w-full text-sm font-medium py-2 rounded-xl transition-colors flex items-center justify-center gap-2 hover:bg-muted/50 border border-transparent hover:border-border ${optimisticIsPaused ? 'text-success hover:text-success' : 'text-warning hover:text-warning'}`}
      title={optimisticIsPaused ? "Resume your plan to start using the library again" : "Pause your plan if you won't be using the library for 7+ days"}
    >
      {optimisticIsPaused ? (
        <><PlayCircle className="w-4 h-4" /> Resume Plan</>
      ) : (
        <><PauseCircle className="w-4 h-4" /> Pause Plan</>
      )}
    </Button>
  )
}
