"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSavedStore } from "@/store/use-saved-store";
import { getSavedLibraries } from "./actions";
import Link from "next/link";
import { DeferredSaveButton } from "@/components/deferred-save-button";
import { MapPin, ArrowRight } from "lucide-react";

type SavedLibrary = Awaited<ReturnType<typeof getSavedLibraries>>[number];

export default function SavedPage() {
  const { savedLibraryIds } = useSavedStore();
  const [libraries, setLibraries] = useState<SavedLibrary[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setHydrated(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    let isMounted = true;

    const loadLibraries = async () => {
      if (savedLibraryIds.length === 0) {
        if (isMounted) {
          setLibraries([]);
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setLoading(true);
      }

      const data = await getSavedLibraries(savedLibraryIds);
      if (!isMounted) {
        return;
      }

      const sortedData = [...data].sort((a, b) => {
        return savedLibraryIds.indexOf(b.id) - savedLibraryIds.indexOf(a.id);
      });
      setLibraries(sortedData);
      setLoading(false);
    };

    void loadLibraries();

    return () => {
      isMounted = false;
    };
  }, [savedLibraryIds, hydrated]);

  if (!hydrated) return null;

  return (
    <div className="container mx-auto px-4 py-12 md:py-16 max-w-7xl min-h-[70vh]">
      <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">Saved Libraries</h1>
      <p className="text-muted-foreground text-lg mb-10">Your shortlisted study spaces.</p>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse flex flex-col gap-3">
              <div className="w-full aspect-4/3 bg-muted rounded-xl" />
              <div className="h-4 bg-muted rounded-md w-3/4" />
              <div className="h-4 bg-muted rounded-md w-1/2" />
            </div>
          ))}
        </div>
      ) : libraries.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-border mt-8">
          <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-border">
            <MapPin className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <h2 className="text-xl font-bold mb-2">No libraries saved yet</h2>
          <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
            Click the heart icon on any library to save it here for later to build your shortlist.
          </p>
          <Link 
            href="/delhi/libraries"
            className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-medium hover:scale-105 active:scale-95 transition-transform"
          >
            Explore Libraries <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {libraries.map((lib, index) => (
            <Link
              key={lib.id}
              href={`/${lib.city.toLowerCase()}/library/${lib.slug}`}
              className="group block relative"
            >
              <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden bg-muted mb-3">
                {lib.coverImageUrl ? (
                  <Image
                    src={lib.coverImageUrl}
                    alt={`${lib.display_name} thumbnail`}
                    fill
                    priority={index < 4}
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="h-10 w-10 text-muted-foreground/20" />
                  </div>
                )}
                <DeferredSaveButton libraryId={lib.id} />
                {lib.verification_status === "verified" && (
                  <div className="absolute top-3 left-3 bg-white/95 px-2 py-0.5 rounded-md text-xs font-bold border border-black/5 shadow-sm">
                    Verified
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-base leading-tight group-hover:underline line-clamp-1">
                  {lib.display_name}
                </h3>
                <p className="text-muted-foreground text-sm mt-0.5 truncate">
                  {lib.locality}
                </p>
                {lib.nearest_metro && lib.nearest_metro_distance_km && (
                  <p className="text-muted-foreground mt-1 text-sm font-medium">
                    {lib.nearest_metro_distance_km} km from {lib.nearest_metro} metro
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
