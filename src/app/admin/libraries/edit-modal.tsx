"use client";

import { useState } from "react";
import { X, Save, Edit3, Plus, Trash2, Loader2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateLibraryBranch } from "./actions";
import { uploadLibraryImage, deleteLibraryImage } from "./image-actions";
import type { Tables } from "@/types/supabase";
import Image from "next/image";

type FeePlan = Tables<"library_fee_plans">;
type LibraryImage = Tables<"library_images">;

type AdminLibraryBranch = Tables<"library_branches"> & {
  library_fee_plans?: FeePlan[];
  library_images?: LibraryImage[];
};

interface EditLibraryModalProps {
  library: AdminLibraryBranch;
}

export function EditLibraryModal({ library }: EditLibraryModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Deep copy so we don't mutate props directly
  const [plans, setPlans] = useState<Partial<FeePlan>[]>(
    (library.library_fee_plans || []).map(p => ({ ...p }))
  );

  const [images, setImages] = useState<LibraryImage[]>(
    library.library_images ? [...library.library_images] : []
  );

  const addPlan = () => {
    setPlans([...plans, { duration_label: "Monthly", price: 0, seat_type: "Unreserved" }]);
  };

  const removePlan = (index: number) => {
    setPlans(plans.filter((_, i) => i !== index));
  };

  const updatePlan = (index: number, field: keyof FeePlan, value: any) => {
    const newPlans = [...plans];
    newPlans[index] = { ...newPlans[index], [field]: value };
    setPlans(newPlans);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    setIsUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadLibraryImage(library.id, formData);
    
    // We expect the page to revalidate but for instant UI we could just reload or assume it's there
    if (result.success) {
       // A cheap way to force the table to refresh the images list since it revalidated server-side is to reload
       window.location.reload();
    } else {
      alert("Upload failed: " + result.error);
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    setImages(images.filter(img => img.id !== imageId));
    await deleteLibraryImage(imageId);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    
    // Inject the serialized plans
    formData.append("fee_plans_json", JSON.stringify(plans));

    const result = await updateLibraryBranch(library.id, formData);
    
    setIsSaving(false);
    if (result.success) {
      setIsOpen(false);
    } else {
      alert("Failed to update: " + result.error);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="text-amber-600 hover:text-amber-700 hover:underline font-medium text-xs flex items-center justify-end w-full"
      >
        <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div>
                <h2 className="text-xl font-bold">Edit Library details</h2>
                <p className="text-xs text-muted-foreground mt-1">ID: {library.id}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="rounded-full h-8 w-8 p-0">
                <X className="w-5 h-5 text-muted-foreground" />
              </Button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overflow-x-hidden p-6" id="edit-form">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                
                {/* Name & Basic Info */}
                <div className="md:col-span-2">
                  <h3 className="font-semibold text-sm border-b pb-2 mb-4 text-black">Core Details</h3>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Display Name</label>
                  <input name="display_name" defaultValue={library.display_name} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Locality</label>
                  <input name="locality" defaultValue={library.locality || ""} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">City</label>
                  <input name="city" defaultValue={library.city} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">District</label>
                  <input name="district" defaultValue={library.district || ""} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none" />
                </div>

                {/* Location Details */}
                <div className="md:col-span-2 mt-2">
                  <h3 className="font-semibold text-sm border-b pb-2 mb-4 text-black">Location Details</h3>
                </div>

                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Address</label>
                  <textarea name="full_address" defaultValue={library.full_address || ""} rows={2} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">PIN Code</label>
                  <input name="pin_code" defaultValue={library.pin_code} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none" required />
                </div>
                
                {/* Metro Connection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nearest Metro</label>
                  <input name="nearest_metro" defaultValue={library.nearest_metro || ""} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Metro Dist. (KM)</label>
                  <input name="nearest_metro_distance_km" type="number" step="0.01" defaultValue={library.nearest_metro_distance_km !== null ? library.nearest_metro_distance_km : ""} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none" placeholder="e.g. 1.2" />
                </div>

                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Google Maps Link</label>
                  <input name="map_link" defaultValue={library.map_link || ""} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none" placeholder="https://maps.google.com/..." />
                </div>

                {/* Facilities & Logistics */}
                <div className="md:col-span-2 mt-2">
                  <h3 className="font-semibold text-sm border-b pb-2 mb-4 text-black">Facilities & Logistics</h3>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Opening Time</label>
                  <input name="opening_time" type="time" defaultValue={library.opening_time || ""} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Closing Time</label>
                  <input name="closing_time" type="time" defaultValue={library.closing_time || ""} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</label>
                  <input name="phone_number" defaultValue={library.phone_number || ""} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">WhatsApp</label>
                  <input name="whatsapp_number" defaultValue={library.whatsapp_number || ""} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none" />
                </div>

                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amenities Text <span className="text-normal font-normal lowercase">(comma separated)</span></label>
                  <input name="amenities_text" defaultValue={library.amenities_text || ""} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none placeholder:text-muted-foreground/50" placeholder="AC, Wi-Fi, Water" />
                </div>

                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description (50 words)</label>
                  <textarea name="description" defaultValue={library.description || ""} rows={4} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none" />
                </div>

                {/* Fee Plans */}
                <div className="md:col-span-2 mt-2">
                  <div className="flex items-center justify-between border-b pb-2 mb-4">
                    <h3 className="font-semibold text-sm text-black">Fee Plans</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addPlan} className="h-7 text-xs px-2">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Plan
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {plans.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No plans added yet.</p>
                    ) : (
                      plans.map((plan, index) => (
                        <div key={index} className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-muted/20 p-3 rounded-lg border border-border/50">
                          <div className="flex-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Duration</label>
                            <select 
                              value={plan.duration_label || "Monthly"} 
                              onChange={(e) => updatePlan(index, "duration_label", e.target.value)}
                              className="w-full px-2 py-1.5 border rounded text-sm bg-white"
                            >
                              <option value="Daily">Daily</option>
                              <option value="Monthly">Monthly</option>
                              <option value="Quarterly">Quarterly</option>
                              <option value="Half-Yearly">Half-Yearly</option>
                              <option value="Yearly">Yearly</option>
                            </select>
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Seat Type</label>
                            <select 
                              value={plan.seat_type || "Unreserved"} 
                              onChange={(e) => updatePlan(index, "seat_type", e.target.value)}
                              className="w-full px-2 py-1.5 border rounded text-sm bg-white"
                            >
                              <option value="Reserved">Reserved</option>
                              <option value="Unreserved">Unreserved</option>
                            </select>
                          </div>
                          <div className="w-24">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Price (₹)</label>
                            <input 
                              type="number" 
                              value={plan.price || 0} 
                              onChange={(e) => updatePlan(index, "price", parseFloat(e.target.value))}
                              className="w-full px-2 py-1.5 border rounded text-sm bg-white"
                            />
                          </div>
                          <div className="mt-5">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removePlan(index)} className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Photos */}
                <div className="md:col-span-2 mt-2">
                  <div className="flex items-center justify-between border-b pb-2 mb-4">
                    <h3 className="font-semibold text-sm text-black">Photos</h3>
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
                        className={`inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md px-3 h-7 text-xs cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        {isUploading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5 mr-1" />}
                        Add Photo
                      </label>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {images.map((img) => (
                      <div key={img.id} className="group relative aspect-square rounded-md overflow-hidden bg-muted border border-border">
                        <Image 
                          src={img.imagekit_url + "?tr=w-150,h-150,fo-auto"} 
                          alt="Library Photo" 
                          fill
                          className="object-cover" 
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button 
                            type="button" 
                            variant="destructive" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleDeleteImage(img.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {images.length === 0 && (
                      <div className="col-span-full py-6 text-center text-sm text-muted-foreground border-2 border-dashed border-border rounded-lg">
                        No photos added yet.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </form>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 bg-muted/10">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="edit-form" disabled={isSaving} className="font-semibold min-w-32">
                {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2"/> Save Changes</>}
              </Button>
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}
