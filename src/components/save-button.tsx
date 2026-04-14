"use client";

import { Heart } from "lucide-react";
import { useSavedStore } from "@/store/use-saved-store";

export function SaveButton({ libraryId }: { libraryId: string }) {
  const { isSaved, toggleSaved } = useSavedStore();
  const active = isSaved(libraryId);

  return (
    <button
      className="absolute top-3 right-3 text-white hover:scale-110 active:scale-95 transition-transform drop-shadow-md z-10"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSaved(libraryId);
      }}
      aria-label="Save library"
    >
      <Heart 
        fill={active ? "#ef4444" : "rgba(0,0,0,0.4)"} 
        stroke={active ? "#ef4444" : "white"} 
        strokeWidth={1.5} 
        className="h-6 w-6" 
      />
    </button>
  );
}
