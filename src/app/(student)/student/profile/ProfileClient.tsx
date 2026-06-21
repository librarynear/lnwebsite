'use client'

import { useState, useEffect } from "react"
import { updateStudentProfile } from "@/app/actions/student-profile-actions"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { User, Camera, ShieldCheck, Loader2 } from "lucide-react"

import { UpdatePhoneModal } from "./UpdatePhoneModal"
export function ProfileClient({ user: initialUser }: { user: any }) {
  const [user, setUser] = useState(initialUser)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [success, setSuccess] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(user.profilePhotoUrl || "")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    // Check if returning from Cashfree OKYC
    const verificationId = localStorage.getItem("cashfreeVerificationId");
    if (verificationId) {
      verifyCashfreeReturn(verificationId);
    }
  }, []);

  async function verifyCashfreeReturn(verification_id: string) {
    setVerifying(true);
    localStorage.removeItem("cashfreeVerificationId"); // Clear it so we don't verify again on refresh

    try {
      const res = await fetch('/api/kyc/cashfree/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verification_id })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setUser({ ...user, ...data.user });
        setPhotoUrl(data.user.profilePhotoUrl);
      } else {
        alert("DigiLocker verification failed or was cancelled.");
      }
    } catch (e) {
      console.error(e);
      alert("Error verifying DigiLocker data.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setSuccess(false)
    if (selectedFile) {
      formData.set("profilePhotoFile", selectedFile);
    }
    await updateStudentProfile(formData)
    setLoading(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  async function handleVerifyDigilocker() {
    setVerifying(true)
    try {
      const res = await fetch('/api/kyc/cashfree/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          redirectUrl: window.location.origin + "/student/profile" 
        })
      });
      
      const data = await res.json();
      
      if (res.ok && data.url) {
        localStorage.setItem("cashfreeVerificationId", data.verification_id);
        window.location.href = data.url; // Redirect to Cashfree Sandbox
      } else {
        alert(data.error || "Failed to initiate DigiLocker");
        setVerifying(false);
      }
    } catch (e) {
      console.error(e);
      setVerifying(false);
    }
  }

  return (
    <div className="bg-card border border-border shadow-sm rounded-3xl p-6 md:p-10 relative">
      {user.digilockerVerified && (
        <div className="absolute top-6 right-6 flex items-center gap-2 bg-success/10 text-success px-4 py-2 rounded-full font-bold text-sm">
          <ShieldCheck className="w-5 h-5" /> KYC Verified
        </div>
      )}

      <form key={user.digilockerVerified ? 'verified' : 'unverified'} action={handleSubmit} className="space-y-8 mt-4">
        
        {/* Profile Picture Section */}
        <div className="flex flex-col md:flex-row items-center gap-6 pb-8 border-b border-border">
          <div className={`w-32 h-32 rounded-full border-4 border-muted flex items-center justify-center bg-muted/30 overflow-hidden relative shrink-0 ${user.digilockerVerified ? 'opacity-80' : 'group'}`}>
            {photoUrl ? (
              <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-muted-foreground" />
            )}
            {!user.digilockerVerified && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <Camera className="w-8 h-8 text-white" />
              </div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
              disabled={user.digilockerVerified}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  setSelectedFile(file);
                  setPhotoUrl(URL.createObjectURL(file)); // preview
                }
              }}
            />
          </div>
          <div className="flex-1 space-y-2 w-full">

          </div>
        </div>

        {/* KYC Details Section */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-foreground">KYC Details</h2>
            {!user.digilockerVerified && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleVerifyDigilocker}
                disabled={verifying}
                className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 gap-2"
              >
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {verifying ? "Fetching from DigiLocker..." : "Verify with DigiLocker"}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Legal Name *</Label>
              <Input id="name" name="name" defaultValue={user.name} required readOnly={user.digilockerVerified} className={user.digilockerVerified ? "bg-muted cursor-not-allowed text-muted-foreground" : ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uniqueId">FocusX ID</Label>
              <Input id="uniqueId" value={user.uniqueId || "Not Generated"} readOnly className="bg-muted font-mono font-bold cursor-not-allowed text-muted-foreground" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" name="email" defaultValue={user.email} placeholder="your@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex gap-2">
                <Input id="phone" name="phone" value={user.phone || ""} readOnly className="bg-muted cursor-not-allowed text-muted-foreground" />
                <UpdatePhoneModal currentPhone={user.phone} onPhoneUpdated={(newPhone) => setUser({...user, phone: newPhone})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" name="dob" type="date" defaultValue={user.dob ? new Date(user.dob).toISOString().split('T')[0] : ""} readOnly={user.digilockerVerified} className={user.digilockerVerified ? "bg-muted cursor-not-allowed text-muted-foreground" : ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              {user.digilockerVerified ? (
                <Input name="gender" defaultValue={user.gender || ""} readOnly className="bg-muted cursor-not-allowed text-muted-foreground uppercase" />
              ) : (
                <Select name="gender" defaultValue={user.gender || undefined}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Verified Address</Label>
              <Input id="address" name="address" defaultValue={user.address || ""} placeholder="Full residential address" readOnly={user.digilockerVerified} className={user.digilockerVerified ? "bg-muted cursor-not-allowed text-muted-foreground" : ""} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="locality">Locality</Label>
              <Input id="locality" name="locality" defaultValue={user.locality || ""} placeholder="e.g. Rohini, Dwarka" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="qualification">Highest Qualification</Label>
              <Input id="qualification" name="qualification" defaultValue={user.qualification || ""} placeholder="e.g. B.Tech, 12th Pass" />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="organization">Organization / College</Label>
              <Input id="organization" name="organization" defaultValue={user.organization || ""} placeholder="e.g. Delhi University, UPSC Prep" />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-border flex items-center justify-between">
          <div>
            {success && <span className="text-success font-bold text-sm bg-success/10 px-3 py-1 rounded-full">Profile updated successfully!</span>}
          </div>
          <Button type="submit" disabled={loading} className="px-8 font-bold text-lg h-12 rounded-xl w-full sm:w-auto">
            {loading ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </form>
    </div>
  )
}
