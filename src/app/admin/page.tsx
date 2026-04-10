import { supabaseServer } from "@/lib/supabase-server";
import { LeadStatusSelect } from "./lead-status-select";

export default async function AdminLeadsPage() {
  const { data: leads, error } = await supabaseServer
    .from("leads")
    .select(`
      *,
      library_branches (
        display_name,
        slug,
        city
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return <div className="p-8 text-red-500">Error loading leads: {error.message}</div>;
  }

  const allLeads = leads ?? [];
  const newLeadsCount = allLeads.filter(l => !l.status || l.status === "new").length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-black mb-1">Leads Inbox</h1>
          <p className="text-muted-foreground text-sm">
            Manage incoming enquiries from students.
          </p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-semibold border border-blue-200">
          {newLeadsCount} New Lead{newLeadsCount !== 1 && "s"}
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Student</th>
              <th className="px-6 py-4">Library Enquired</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {allLeads.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                  No leads yet.
                </td>
              </tr>
            ) : (
              allLeads.map((lead) => {
                const lib = lead.library_branches as any;
                const libName = lib?.display_name || "Unknown Library";
                return (
                  <tr key={lead.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(lead.created_at || "").toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-black">{lead.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{lead.phone_number}</div>
                    </td>
                    <td className="px-6 py-4">
                      {lib ? (
                        <a 
                          href={`/${lib.city}/library/${lib.slug}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="font-medium text-primary hover:underline"
                        >
                          {libName}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">{libName}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <LeadStatusSelect leadId={lead.id} currentStatus={lead.status} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
