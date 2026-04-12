import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SavedStore {
  hasHydrated: boolean;
  savedLibraryIds: string[];
  toggleSaved: (id: string) => void;
  isSaved: (id: string) => boolean;
  replaceSavedLibraryIds: (ids: string[]) => void;
  setHasHydrated: (value: boolean) => void;
}

export const useSavedStore = create<SavedStore>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      savedLibraryIds: [],

      toggleSaved: (id) => set((state) => {
        const isCurrentlySaved = state.savedLibraryIds.includes(id);
        if (isCurrentlySaved) {
          return {
            savedLibraryIds: state.savedLibraryIds.filter((savedId) => savedId !== id),
          };
        } else {
          return {
            savedLibraryIds: [...state.savedLibraryIds, id],
          };
        }
      }),

      isSaved: (id) => get().savedLibraryIds.includes(id),
      replaceSavedLibraryIds: (ids) => set({
        savedLibraryIds: [...new Set(ids.filter(Boolean))],
      }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "library-near-saved-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
