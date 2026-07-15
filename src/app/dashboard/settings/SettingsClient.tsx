'use client'

import { useState } from "react"
import { Save, Loader2, MapPin, Phone, Building, Clock, Image as ImageIcon, Trash2, CreditCard } from "lucide-react"
import { updateLibrarySettings } from "@/app/actions/library-actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageKitProvider, IKUpload } from "imagekitio-next"
import { HardwareProvisioningCard } from "./HardwareProvisioningCard"
import Image from "next/image"
import type { Library as LibraryRecord } from "@prisma/client"

interface ImageKitAuthResponse {
  signature: string;
  expire: number;
  token: string;
}

interface UploadResult {
  url: string;
}

function isImageKitAuthResponse(value: unknown): value is ImageKitAuthResponse {
  if (typeof value !== "object" || value === null) return false;

  const response = value as Record<string, unknown>;
  return (
    typeof response.signature === "string" &&
    typeof response.expire === "number" &&
    typeof response.token === "string"
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

const authenticator = async () => {
  try {
    const response = await fetch("/api/imagekit/auth");
    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    const data: unknown = await response.json();
    if (!isImageKitAuthResponse(data)) {
      throw new Error("Authentication response was invalid.");
    }
    return data;
  } catch (error) {
    throw new Error(`Authentication request failed: ${getErrorMessage(error, "Unknown error")}`);
  }
};

const facilityOptions = [
  "AC", "Wi-Fi", "RO Water", "Washroom", "Power Backup", 
  "CCTV", "Locker", "Parking", "Tea/Coffee", 
  "Security Guard", "Charging Points", "Silent Zone"
]

export function SettingsClient({ library }: { library: LibraryRecord }) {
  const [isSaving, setIsSaving] = useState(false)
  const [photos, setPhotos] = useState<string[]>(library.photos || []);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isKycLoading, setIsKycLoading] = useState(false);
  const [phone, setPhone] = useState(library.managerPhone || "");
  const [whatsapp, setWhatsapp] = useState(library.whatsapp || "");
  const [sameAsPhone, setSameAsPhone] = useState(library.whatsapp === library.managerPhone && !!library.managerPhone);

  async function handleSave(formData: FormData) {
    setIsSaving(true)
    try {
      formData.append("photos", JSON.stringify(photos));
      formData.append("whatsapp", sameAsPhone ? phone : whatsapp);
      await updateLibrarySettings(formData)
      alert("Settings saved successfully!")
    } catch {
      alert("Failed to save settings.")
    } finally {
      setIsSaving(false)
    }
  }

  const [uploadingPassbook, setUploadingPassbook] = useState(false);

  const onUploadStart = () => setUploadingImage(true);
  const onUploadSuccess = (res: UploadResult) => {
    setPhotos(prev => [...prev, res.url].slice(0, 3));
    setUploadingImage(false);
  };
  const onUploadError = (err: unknown) => {
    console.error(err);
    alert("Image upload failed.");
    setUploadingImage(false);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  }

  const handlePassbookUploadSuccess = async (res: UploadResult) => {
    setUploadingPassbook(false);
    setIsKycLoading(true);
    try {
      const { uploadPassbook } = await import('@/app/actions/library-actions');
      await uploadPassbook(library.id, res.url);
      alert("Passbook uploaded successfully. Your library is now pending review.");
      // The page will revalidate automatically
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Failed to update KYC status."));
    } finally {
      setIsKycLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground">Library Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your library&apos;s public profile and facilities.</p>
      </div>

      <form action={handleSave} className="space-y-8">
        <input type="hidden" name="id" value={library.id} />
        
        {/* Basic Info */}
        <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Building className="w-5 h-5 text-primary" /> Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name *</Label>
              <Input id="name" name="name" defaultValue={library.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="managerName">Manager Name</Label>
              <Input id="managerName" name="managerName" defaultValue={library.managerName || ""} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description of Library</Label>
              <textarea 
                id="description" 
                name="description" 
                defaultValue={library.description || ""}
                placeholder="Tell students what makes your library a great place to study..."
                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seatsAvailable">Seats Available *</Label>
              <Input id="seatsAvailable" name="seatsAvailable" type="number" defaultValue={library.seatsAvailable || ""} required />
            </div>
          </div>
        </div>

        {/* Location Info */}
        <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" /> Location & Address
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Full Address *</Label>
              <Input id="address" name="address" defaultValue={library.address} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locality">Locality *</Label>
              <Input id="locality" name="locality" defaultValue={library.locality || ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input id="city" name="city" defaultValue={library.city || ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">District</Label>
              <Input id="district" name="district" defaultValue={library.district || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input id="state" name="state" defaultValue={library.state || ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pinCode">PIN Code *</Label>
              <Input id="pinCode" name="pinCode" defaultValue={library.pinCode || ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="googleMapsUrl">Google Maps Link *</Label>
              <Input id="googleMapsUrl" name="googleMapsUrl" defaultValue={library.googleMapsUrl || ""} placeholder="https://maps.google.com/..." required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metroStation">Nearest Metro Station</Label>
              <Input id="metroStation" name="metroStation" defaultValue={library.metroStation || ""} placeholder="e.g. Rajiv Chowk" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metroDistance">Metro Distance (km)</Label>
              <Input id="metroDistance" name="metroDistance" type="number" step="0.1" defaultValue={library.metroDistance || ""} placeholder="e.g. 0.5" />
            </div>
          </div>
        </div>

        {/* Logistics & Contact */}
        <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Facilities & Logistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <Label htmlFor="openingTime">Opening Time *</Label>
              <Input id="openingTime" name="openingTime" type="time" defaultValue={library.openingTime || "08:00"} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closingTime">Closing Time *</Label>
              <Input id="closingTime" name="closingTime" type="time" defaultValue={library.closingTime || "22:00"} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="managerPhone">Phone (10-digit mobile number) *</Label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input id="managerPhone" name="managerPhone" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-9" required pattern="[0-9]{10}" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp (Optional)</Label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input id="whatsapp" value={sameAsPhone ? phone : whatsapp} onChange={(e) => setWhatsapp(e.target.value)} disabled={sameAsPhone} className="pl-9 disabled:opacity-70" />
              </div>
              <label className="flex items-center gap-2 mt-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={sameAsPhone} onChange={(e) => setSameAsPhone(e.target.checked)} className="rounded border-border accent-primary" />
                Same as phone number
              </label>
            </div>
          </div>

          <h3 className="font-bold mb-4">Amenities *</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {facilityOptions.map((facility) => {
              const isChecked = library.facilities?.includes(facility);
              return (
                <label key={facility} className="flex items-center gap-3 p-4 rounded-xl border border-border/60 hover:bg-muted/50 hover:border-primary/50 cursor-pointer transition-all has-[:checked]:bg-primary/5 has-[:checked]:border-primary">
                  <input 
                    type="checkbox" 
                    name={`facility_${facility}`} 
                    defaultChecked={isChecked}
                    className="w-5 h-5 rounded border-border text-primary focus:ring-primary accent-primary" 
                  />
                  <span className="font-medium text-foreground select-none">{facility}</span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Photos */}
        <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" /> Library Photos
          </h2>
          <p className="text-sm text-muted-foreground mb-6">Upload up to 3 images, max 5 MB each. (ImageKit)</p>

          <div className="flex flex-wrap gap-4 mb-6">
            {photos.map((url, i) => (
              <div key={i} className="relative w-32 h-32 rounded-xl overflow-hidden border border-border group">
                <Image src={url} alt="Library" fill sizes="128px" className="object-cover" />
                <button 
                  type="button" 
                  onClick={() => removePhoto(i)}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-6 h-6 text-white" />
                </button>
              </div>
            ))}
          </div>

          {photos.length < 3 && (
            <ImageKitProvider 
              publicKey={process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY} 
              urlEndpoint={process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT} 
              authenticator={authenticator}
            >
              <div className="relative border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-muted/30 transition-colors">
                <IKUpload
                  fileName="library_photo"
                  tags={["library"]}
                  onUploadStart={onUploadStart}
                  onError={onUploadError}
                  onSuccess={onUploadSuccess}
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="pointer-events-none flex flex-col items-center gap-2 text-muted-foreground">
                  {uploadingImage ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImageIcon className="w-8 h-8" />}
                  <span className="font-medium">{uploadingImage ? "Uploading..." : "Click or drag to upload"}</span>
                </div>
              </div>
            </ImageKitProvider>
          )}
        </div>

        {/* Payments & KYC */}
        <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" /> Verification & KYC
          </h2>
          <p className="text-sm text-muted-foreground mb-6">Upload your passbook to verify your library.</p>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-foreground">KYC Status</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Status: <span className="font-semibold px-2 py-1 bg-muted rounded-md text-foreground">{library.kycStatus}</span>
              </p>
            </div>
            
            {library.kycStatus !== 'APPROVED' && (
              <div className="relative">
                <ImageKitProvider 
                  publicKey={process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY} 
                  urlEndpoint={process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT} 
                  authenticator={authenticator}
                >
                  <button 
                    type="button"
                    disabled={isKycLoading || uploadingPassbook} 
                    className="bg-[#02042B] hover:bg-[#02042B]/90 text-white font-bold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap overflow-hidden relative"
                  >
                    <IKUpload
                      fileName="passbook_kyc"
                      tags={["kyc"]}
                      onUploadStart={() => setUploadingPassbook(true)}
                      onError={() => { setUploadingPassbook(false); alert("Upload failed"); }}
                      onSuccess={handlePassbookUploadSuccess}
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    {(isKycLoading || uploadingPassbook) ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    {uploadingPassbook ? "Uploading..." : library.passbookPhoto ? "Update Passbook" : "Upload Passbook"}
                  </button>
                </ImageKitProvider>
              </div>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground mt-4 italic">
            Note: Automated Razorpay KYC verification is coming soon!
          </p>
        </div>

        <HardwareProvisioningCard libraryId={library.id} />

        <div className="flex justify-end sticky bottom-4">
          <button 
            type="submit" 
            disabled={isSaving || uploadingImage} 
            className="bg-primary text-primary-foreground font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 text-lg shadow-xl"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} 
            {isSaving ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
