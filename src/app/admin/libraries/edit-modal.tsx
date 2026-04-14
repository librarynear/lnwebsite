"use client";

import { useState } from "react";
import { Edit3, ImagePlus, Loader2, Save, Trash2, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/supabase";
import { deleteLibraryBranch, updateLibraryBranch } from "./actions";
import { deleteLibraryImage, uploadLibraryImage } from "./image-actions";
import { AmenitiesChecklist } from "@/components/library-form/amenities-checklist";
import { FormDraftPersistence } from "@/components/library-form/form-draft-persistence";
import { MapCoordinatesFields } from "@/components/library-form/map-coordinates-fields";
import { PlansEditor } from "@/components/library-form/plans-editor";
import { normalizePlanDrafts } from "@/lib/library-plans";
import { PhoneWhatsappFields } from "@/components/library-form/phone-whatsapp-fields";

type FeePlan = Tables<"library_fee_plans">;
type LibraryImage = Tables<"library_images">;

type AdminLibraryBranch = Tables<"library_branches"> & {
  library_fee_plans?: FeePlan[];
  library_images?: LibraryImage[];
};

interface EditLibraryModalProps {
  library: AdminLibraryBranch;
  allowDelete?: boolean;
}

function parseAmenities(amenitiesText: string | null | undefined) {
  if (!amenitiesText) return [];
  return amenitiesText
    .split(/[,|\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function EditLibraryModal({ library, allowDelete = false }: EditLibraryModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [overrideNearestMetro, setOverrideNearestMetro] = useState(false);
  const [images, setImages] = useState<LibraryImage[]>(
    library.library_images ? [...library.library_images] : [],
  );

  const formId = `edit-form-${library.id}`;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || isUploading) return;

    setIsUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await uploadLibraryImage(library.id, formData);

      if (result.success && result.image) {
        setImages((current) => [...current, result.image]);
      } else {
        alert("Upload failed: " + result.error);
      }
    } catch (error) {
      alert(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    const previousImages = images;
    setImages(images.filter((img) => img.id !== imageId));
    const result = await deleteLibraryImage(imageId);
    if (!result.success) {
      setImages(previousImages);
      alert(`Delete failed: ${result.error}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);

    const result = await updateLibraryBranch(library.id, formData);

    setIsSaving(false);
    if (result.success) {
      window.localStorage.removeItem(`library-edit-draft:${library.id}`);
      window.localStorage.removeItem(`library-edit-map:${library.id}`);
      window.localStorage.removeItem(`library-edit-plans:${library.id}`);
      window.localStorage.removeItem(`library-edit-phone:${library.id}`);
      setIsOpen(false);
    } else {
      alert("Failed to update: " + result.error);
    }
  };

  const handleDeleteLibrary = async () => {
    if (!confirm(`Delete "${library.display_name}" from public listings and editor queues?`)) return;

    setIsDeleting(true);
    const result = await deleteLibraryBranch(library.id);
    setIsDeleting(false);

    if (result.success) {
      setIsOpen(false);
      window.location.reload();
    } else {
      alert("Failed to delete: " + result.error);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center justify-end text-xs font-medium text-amber-600 hover:text-amber-700 hover:underline"
      >
        <Edit3 className="mr-1 h-3.5 w-3.5" />
        Edit
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold">Edit library details</h2>
                <p className="mt-1 text-xs text-muted-foreground">ID: {library.id}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="h-8 w-8 rounded-full p-0">
                <X className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6" id={formId}>
              <FormDraftPersistence formId={formId} storageKey={`library-edit-draft:${library.id}`} />
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <h3 className="mb-4 border-b pb-2 text-sm font-semibold text-black">Core Details</h3>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Display Name *</label>
                  <input name="display_name" defaultValue={library.display_name} className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">City *</label>
                  <input name="city" defaultValue={library.city} className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">State *</label>
                  <input name="state" defaultValue={library.state || "Delhi"} className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">District</label>
                  <input name="district" defaultValue={library.district || ""} className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
                </div>

                <div className="md:col-span-2 mt-2">
                  <h3 className="mb-4 border-b pb-2 text-sm font-semibold text-black">Location Details</h3>
                </div>
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Address *</label>
                  <textarea name="full_address" defaultValue={library.full_address || ""} rows={2} className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PIN Code *</label>
                  <input name="pin_code" defaultValue={library.pin_code} className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Locality *</label>
                  <input name="locality" defaultValue={library.locality || ""} className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" required />
                </div>
                <div className="md:col-span-2">
                  <MapCoordinatesFields
                    initialMapLink={library.map_link || ""}
                    initialLatitude={library.latitude}
                    initialLongitude={library.longitude}
                    storageKey={`library-edit-map:${library.id}`}
                    mapLinkRequired
                    coordinatesRequired
                    helperText="Nearest metro will be calculated automatically from your location."
                  />
                </div>
                <div className="md:col-span-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900">
                  Nearest metro will be calculated automatically from your location.
                </div>
                <div className="md:col-span-2 space-y-3 rounded-xl border border-border bg-slate-50/70 p-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-black">
                    <input
                      type="checkbox"
                      name="override_nearest_metro"
                      checked={overrideNearestMetro}
                      onChange={(event) => setOverrideNearestMetro(event.target.checked)}
                    />
                    Override nearest metro manually
                  </label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nearest Metro</label>
                      <input
                        name="nearest_metro"
                        defaultValue={library.nearest_metro || ""}
                        className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-muted"
                        disabled={!overrideNearestMetro}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Metro Distance (KM)</label>
                      <input
                        name="nearest_metro_distance_km"
                        type="number"
                        step="0.01"
                        defaultValue={library.nearest_metro_distance_km ?? ""}
                        className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-muted"
                        disabled={!overrideNearestMetro}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave this off in normal cases. Turn it on only if you need to override the auto-calculated metro.
                  </p>
                </div>

                <div className="md:col-span-2 mt-2">
                  <h3 className="mb-4 border-b pb-2 text-sm font-semibold text-black">Facilities & Logistics</h3>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Opening Time *</label>
                  <input name="opening_time" type="time" defaultValue={library.opening_time || ""} className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Closing Time *</label>
                  <input name="closing_time" type="time" defaultValue={library.closing_time || ""} className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" required />
                </div>
                <PhoneWhatsappFields
                  initialPhone={library.phone_number || ""}
                  initialWhatsapp={library.whatsapp_number || ""}
                  storageKey={`library-edit-phone:${library.id}`}
                />
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amenities *</label>
                  <AmenitiesChecklist initialSelected={parseAmenities(library.amenities_text)} />
                </div>

                <div className="md:col-span-2 mt-2">
                  <h3 className="mb-4 border-b pb-2 text-sm font-semibold text-black">About & Seats</h3>
                </div>
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
                  <textarea name="description" defaultValue={library.description || ""} rows={4} className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Seats *</label>
                  <input name="total_seats" type="number" min="1" defaultValue={library.total_seats ?? ""} className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" required />
                </div>

                <div className="md:col-span-2 mt-2">
                  <PlansEditor
                    initialPlans={normalizePlanDrafts(library.library_fee_plans || [])}
                    storageKey={`library-edit-plans:${library.id}`}
                    note="Admin and sales use the same plan form. Admins also have the extra delete action below."
                  />
                </div>

                <div className="md:col-span-2 mt-2">
                  <div className="mb-4 flex items-center justify-between border-b pb-2">
                    <h3 className="text-sm font-semibold text-black">Photos</h3>
                    <div>
                      <input
                        type="file"
                        id={`photo-upload-${library.id}`}
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                      <label
                        htmlFor={`photo-upload-${library.id}`}
                        className={`inline-flex h-7 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${isUploading ? "pointer-events-none opacity-50" : ""}`}
                      >
                        {isUploading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="mr-1 h-3.5 w-3.5" />}
                        {isUploading ? "Uploading..." : "Add Photo"}
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
                    {images.map((img) => (
                      <div key={img.id} className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted">
                        <Image
                          src={`${img.imagekit_url}?tr=w-150,h-150,fo-auto`}
                          alt="Library Photo"
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button type="button" variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteImage(img.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {images.length === 0 ? (
                      <div className="col-span-full rounded-lg border-2 border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                        No photos added yet.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </form>

            <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/10 px-6 py-4">
              <div>
                {allowDelete ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void handleDeleteLibrary()}
                    disabled={isDeleting || isSaving}
                    className="font-semibold"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Library
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
              <div className="flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" form={formId} disabled={isSaving || isDeleting} className="min-w-32 font-semibold">
                  {isSaving ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
