import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { requireApprovedStaff } from "@/lib/staff-access";
import { saveStaffAccess } from "./actions";

export default async function AdminTeamPage() {
  await requireApprovedStaff(["admin"]);

  const [{ data: profiles }, { data: staffUsers }, { data: activityLogs }] = await Promise.all([
    supabaseServer.from("profiles").select("*").order("created_at", { ascending: false }),
    supabaseServer.from("staff_users").select("*"),
    supabaseServer.from("library_activity_logs").select("actor_user_id, action_type"),
  ]);

  const staffMap = new Map((staffUsers ?? []).map((row) => [row.user_id, row]));
  const metrics = new Map<string, { total: number; verified: number; edits: number }>();

  for (const log of activityLogs ?? []) {
    if (!log.actor_user_id) continue;
    const current = metrics.get(log.actor_user_id) ?? { total: 0, verified: 0, edits: 0 };
    current.total += 1;
    if (log.action_type === "verification_updated") current.verified += 1;
    if (log.action_type === "library_updated") current.edits += 1;
    metrics.set(log.actor_user_id, current);
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black mb-1">Team Access</h1>
        <p className="text-sm text-muted-foreground">
          Approve staff, assign roles, and open individual work profiles.
        </p>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Approved</th>
              <th className="px-6 py-4">Work</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(profiles ?? []).map((profile) => {
              const staff = staffMap.get(profile.id);
              const stat = metrics.get(profile.id) ?? { total: 0, verified: 0, edits: 0 };
              return (
                <tr key={profile.id} className="hover:bg-muted/40">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-black">{profile.full_name || "Unnamed user"}</div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{profile.email || "-"}</td>
                  <td className="px-6 py-4">
                    <form action={saveStaffAccess} className="flex items-center gap-2">
                      <input type="hidden" name="user_id" value={profile.id} />
                      <select
                        name="role"
                        defaultValue={staff?.role ?? "sales"}
                        className="rounded-md border border-border bg-white px-2 py-1 text-xs"
                      >
                        <option value="sales">Sales</option>
                        <option value="admin">Admin</option>
                      </select>
                      <select
                        name="is_approved"
                        defaultValue={String(staff?.is_approved ?? false)}
                        className="rounded-md border border-border bg-white px-2 py-1 text-xs"
                      >
                        <option value="false">Pending</option>
                        <option value="true">Approved</option>
                      </select>
                      <button type="submit" className="rounded-md bg-black px-3 py-1 text-xs font-medium text-white">
                        Save
                      </button>
                    </form>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      staff?.is_approved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {staff?.is_approved ? "Approved" : "Pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {stat.total} actions · {stat.edits} edits · {stat.verified} verifies
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/admin/team/${profile.id}`} className="text-primary hover:underline font-medium text-xs">
                      Open full profile
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
