"use client";

import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Grid, Lock } from "lucide-react";

interface LiveSeatMapProps {
  library: any;
  occupiedSeatIds: string[];
  targetSeatId?: string | null; // Highlight specific seat
  isFlexible?: boolean; // Highlight all available seats
  interactive?: boolean; // Whether seats can be clicked
  selectedSeat?: any;
  onSeatSelect?: (seat: any) => void;
  compactMode?: boolean;
}

export default function LiveSeatMap({ 
  library, 
  occupiedSeatIds, 
  targetSeatId,
  isFlexible,
  interactive = false,
  selectedSeat,
  onSeatSelect,
  compactMode = false
}: LiveSeatMapProps) {
  
  const maxX = Math.max(...(library.seats?.map((s:any) => s.gridX) || [0]), 0);
  const maxY = Math.max(...(library.seats?.map((s:any) => s.gridY) || [0]), 0);

  const renderSeat = (seat: any, emptyKey?: string | number) => {
    if (!seat) return <div key={emptyKey} className="w-12 h-12"></div>;

    const isOccupied = occupiedSeatIds.includes(seat.id);
    const isSelected = selectedSeat?.id === seat.id;
    const isTarget = targetSeatId === seat.id;
    
    let seatClass = "bg-background border-border text-foreground";
    
    // In read-only mode, we display colors based on target/flexible
    if (!interactive) {
      if (isTarget) {
        seatClass = "bg-primary border-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.5)] scale-110 z-10 ring-4 ring-primary/30";
      } else if (isFlexible && !isOccupied && seat.type !== 'NON_RESERVABLE') {
        seatClass = "bg-success border-success text-success-foreground shadow-sm ring-2 ring-success/30";
      } else if (isOccupied || seat.type === 'NON_RESERVABLE') {
        seatClass = "bg-muted border-border/50 text-muted-foreground opacity-30";
      } else {
        seatClass = "bg-background border-border text-foreground opacity-50";
      }
    } else {
      // Interactive mode (booking flow)
      const isDisabled = isOccupied || seat.type === 'NON_RESERVABLE';
      if (isDisabled) {
        seatClass = "bg-muted border-border/50 text-muted-foreground opacity-50 cursor-not-allowed shadow-none";
      } else if (isSelected) {
        seatClass = "bg-primary border-primary text-primary-foreground shadow-[2px_8px_0px_0px_rgba(0,0,0,0.2)] -translate-y-2";
      } else {
        seatClass = "bg-background border-border hover:border-primary cursor-pointer text-foreground shadow-[2px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[4px_8px_0px_0px_rgba(0,0,0,0.1)] hover:-translate-y-2";
      }
    }

    return (
      <div 
        key={seat.id} 
        onClick={() => {
          if (interactive && onSeatSelect && !isOccupied && seat.type !== 'NON_RESERVABLE') {
            onSeatSelect(seat);
          }
        }}
        className={`relative w-12 h-12 rounded-lg border-2 flex items-center justify-center font-bold text-xs transition-all duration-300 shrink-0 ${seatClass}`}
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
    );
  };

  return (
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
              {compactMode ? (
                <div className="flex flex-wrap justify-center gap-3 w-full max-w-[600px] mx-auto">
                  {library.seats
                    ?.filter((s:any) => s.type !== 'EMPTY')
                    .sort((a:any, b:any) => a.gridY === b.gridY ? a.gridX - b.gridX : a.gridY - b.gridY)
                    .map((seat:any) => renderSeat(seat))
                  }
                </div>
              ) : (
                Array.from({ length: maxY + 1 }).map((_, y) => (
                  <div key={y} className="flex justify-center gap-3">
                    {Array.from({ length: maxX + 1 }).map((_, x) => {
                      const seat = library.seats?.find((s:any) => s.gridX === x && s.gridY === y);
                      return renderSeat(seat, x);
                    })}
                  </div>
                ))
              )}
              <div className="mt-4 mx-auto w-full text-center py-1.5 bg-border/50 rounded-md text-muted-foreground text-[10px] tracking-widest uppercase font-bold border border-border">
                Front Desk
              </div>
            </div>
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
