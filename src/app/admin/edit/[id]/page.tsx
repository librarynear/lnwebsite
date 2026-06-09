import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateLibraryDetails } from "@/app/actions/admin-actions";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function AdminEditLibraryPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const library = await prisma.library.findUnique({
    where: { id: params.id }
  });

  if (!library) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2 w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">Edit Library</h1>
          <p className="text-muted-foreground">Modify library details before approval.</p>
        </div>
        <span className={`px-3 py-1 text-sm font-bold rounded uppercase tracking-wide ${
          library.kycStatus === "APPROVED" ? "bg-success/10 text-success" : 
          library.kycStatus === "REJECTED" ? "bg-destructive/10 text-destructive" : 
          "bg-warning/10 text-warning"
        }`}>
          {library.kycStatus}
        </span>
      </div>

      <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
        <form action={updateLibraryDetails.bind(null, library.id)} className="space-y-6">
          
          <div className="space-y-2">
            <Label htmlFor="name">Library Name</Label>
            <Input id="name" name="name" defaultValue={library.name} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Full Address</Label>
            <Input id="address" name="address" defaultValue={library.address} required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="managerName">Manager Name</Label>
              <Input id="managerName" name="managerName" defaultValue={library.managerName || ""} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="managerPhone">Manager Phone</Label>
              <Input id="managerPhone" name="managerPhone" defaultValue={library.managerPhone || ""} />
            </div>
          </div>

          {/* Added context fields that the admin might want to view but not edit yet */}
          <div className="pt-4 mt-6 border-t border-border grid grid-cols-2 text-sm text-muted-foreground gap-4">
            <div>
              <span className="block font-medium text-foreground mb-1">Seats Available</span>
              {library.seatsAvailable || 0}
            </div>
            <div>
              <span className="block font-medium text-foreground mb-1">Locality</span>
              {library.locality || "N/A"}
            </div>
            <div>
              <span className="block font-medium text-foreground mb-1">Created At</span>
              {library.createdAt.toLocaleDateString()}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
