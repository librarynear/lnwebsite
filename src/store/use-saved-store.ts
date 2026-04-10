import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SavedStore {
  savedLibraryIds: string[];
  toggleSaved: (id: string) => void;
  isSaved: (id: string) => boolean;
}

export const useSavedStore = create<SavedStore>()(
  persist(
    (set, get) => ({
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
    }),
    {
      name: "library-near-saved-storage",
    }
  )
);
