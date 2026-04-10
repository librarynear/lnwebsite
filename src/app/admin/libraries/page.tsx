import { supabaseServer } from "@/lib/supabase-server";
import { VerificationToggle } from "./verification-toggle";
import { Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { EditLibraryModal } from "./edit-modal";
import { redirect } from "next/navigation";

export default async function AdminLibrariesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string; sort?: string }>;
}) {
  const { q, city, sort } = await searchParams;

  let query = supabaseServer
    .from("library_branches")
    .select("*, library_fee_plans(*), library_images(*)"); // Select all to populate the Edit Modal

  if (q) {
    query = query.or(`display_name.ilike.%${q}%,locality.ilike.%${q}%`);
  }
  
  if (city) {
    query = query.eq("city", city);
  }

  // Sorting Logic
  if (sort === "score_asc") {
    query = query.order("profile_completeness_score", { ascending: true });
  } else if (sort === "name_asc") {
    query = query.order("display_name", { ascending: true });
  } else {
    // Default sort: highest score first
    query = query.order("profile_completeness_score", { ascending: false });
  }

  query = query.limit(100);

  const { data: libraries, error } = await query;

  if (error) {
    return <div className="p-8 text-red-500">Error loading libraries: {error.message}</div>;
  }

  const libs = libraries ?? [];

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black mb-1">Libraries Editor</h1>
          <p className="text-muted-foreground text-sm">
            Quickly find and verify library branches. Showing top 100 results.
          </p>
        </div>

        <form className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search libraries..."
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          
          <select 
            name="city" 
            defaultValue={city || ""}
            className="w-full sm:w-36 py-2 px-3 border border-border rounded-lg text-sm bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">All Cities</option>
            <option value="Delhi">Delhi</option>
            <option value="Noida">Noida</option>
            <option value="Jaipur">Jaipur</option>
          </select>

          <select 
            name="sort" 
            defaultValue={sort || ""}
            className="w-full sm:w-44 py-2 px-3 border border-border rounded-lg text-sm bg-white inline-flex items-center gap-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">Sort: Score (Hi-Lo)</option>
            <option value="score_asc">Sort: Score (Lo-Hi)</option>
            <option value="name_asc">Sort: Name (A-Z)</option>
          </select>
          
          <button type="submit" className="hidden" aria-hidden="true" />
        </form>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Locality</th>
                <th className="px-6 py-4">City</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Timings</th>
                <th className="px-6 py-4 text-center">Score</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {libs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No libraries found.
                  </td>
                </tr>
              ) : (
                libs.map((lib) => (
                  <tr key={lib.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-black max-w-[200px] truncate" title={lib.display_name}>
                      {lib.display_name}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground max-w-[150px] truncate">{lib.locality || "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground capitalize">{lib.city}</td>
                    <td className="px-6 py-4 text-muted-foreground">{lib.phone_number || "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {lib.opening_time && lib.closing_time ? `${lib.opening_time} - ${lib.closing_time}` : "—"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                        (lib.profile_completeness_score ?? 0) >= 80 ? "bg-emerald-50 text-emerald-700" :
                        (lib.profile_completeness_score ?? 0) >= 50 ? "bg-amber-50 text-amber-700" :
                        "bg-red-50 text-red-700"
                      }`}>
                        {lib.profile_completeness_score ?? 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <VerificationToggle 
                        id={lib.id} 
                        isVerified={lib.verification_status === "verified"} 
                      />
                    </td>
                    <td className="px-6 py-4 flex items-center justify-end gap-4 border-l border-border/30 bg-muted/10 h-[64px]">
                      <EditLibraryModal library={lib} />
                      <Link 
                        href={`/${lib.city.toLowerCase()}/library/${lib.slug}`}
                        target="_blank"
                        className="text-primary hover:underline font-medium text-xs whitespace-nowrap"
                      >
                        View Page ↗
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
