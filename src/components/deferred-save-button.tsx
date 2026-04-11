"use client";

import dynamic from "next/dynamic";

const SaveButton = dynamic(
  () => import("@/components/save-button").then((module) => module.SaveButton),
  {
    ssr: false,
    loading: () => (
      <span
        aria-hidden="true"
        className="absolute top-3 right-3 z-10 h-6 w-6 rounded-full bg-white/75 shadow-sm"
      />
    ),
  },
);

export function DeferredSaveButton({ libraryId }: { libraryId: string }) {
  return <SaveButton libraryId={libraryId} />;
}
