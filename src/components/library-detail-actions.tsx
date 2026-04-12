"use client";

import { useState } from "react";
import { Heart, Loader2, Share2 } from "lucide-react";
import { useSavedStore } from "@/store/use-saved-store";

type LibraryDetailActionsProps = {
  libraryId: string;
  libraryName: string;
  locality?: string | null;
  city?: string | null;
};

export function LibraryDetailActions({
  libraryId,
  libraryName,
  locality,
  city,
}: LibraryDetailActionsProps) {
  const { isSaved, toggleSaved } = useSavedStore();
  const [sharing, setSharing] = useState(false);
  const active = isSaved(libraryId);

  async function handleShare() {
    if (sharing) return;
    setSharing(true);

    try {
      const shareUrl = window.location.href;
      const locationLabel = locality || city;
      const shareTitle = locationLabel
        ? `${libraryName}, ${locationLabel} | LibraryNear`
        : `${libraryName} | LibraryNear`;
      const shareText = locationLabel
        ? `Check out ${libraryName} in ${locationLabel} on LibraryNear`
        : `Check out ${libraryName} on LibraryNear`;
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("Share action cancelled or failed:", error);
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="flex gap-2 w-full md:w-auto">
      <button
        type="button"
        onClick={() => void handleShare()}
        className="flex flex-1 items-center justify-center rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted md:flex-none"
      >
        {sharing ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Share2 className="mr-1.5 h-4 w-4" />
        )}
        Share
      </button>

      <button
        type="button"
        onClick={() => toggleSaved(libraryId)}
        className="flex flex-1 items-center justify-center rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted md:flex-none"
        aria-label={active ? "Remove from saved libraries" : "Save library"}
      >
        <Heart
          className="mr-1.5 h-4 w-4"
          fill={active ? "#ef4444" : "none"}
          stroke={active ? "#ef4444" : "currentColor"}
        />
        {active ? "Saved" : "Save"}
      </button>
    </div>
  );
}
