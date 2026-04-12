import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { requireApprovedStaff } from "@/lib/staff-access";
import { addStaffByEmail, saveStaffAccess } from "./actions";

type TeamRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  is_approved: boolean;
};

export default async function AdminTeamPage() {
  await requireApprovedStaff(["admin"]);

  const [{ data: staffUsers }, { data: activityLogs }] = await Promise.all([
    supabaseServer.from("staff_users").select("*").order("created_at", { ascending: false }),
    supabaseServer.from("library_activity_logs").select("actor_user_id, action_type"),
  ]);

  const teamRows = await Promise.all(
    ((staffUsers ?? []) as Array<{ user_id: string; role: string; is_approved: boolean }>).map(async (staff) => {
      const { data: profile } = await supabaseServer
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", staff.user_id)
        .maybeSingle();

      return profile
        ? ({
            id: profile.id,
            full_name: profile.full_name,
            email: profile.email,
            role: staff.role,
            is_approved: staff.is_approved,
          } satisfies TeamRow)
        : null;
    }),
  );

  const metrics = new Map<string, { total: number; verified: number; edits: number }>();
  for (const log of activityLogs ?? []) {
    if (!log.actor_user_id) continue;
    const current = metrics.get(log.actor_user_id) ?? { total: 0, verified: 0, edits: 0 };
    current.total += 1;
    if (log.action_type === "verification_updated") current.verified += 1;
    if (log.action_type === "library_updated") current.edits += 1;
    metrics.set(log.actor_user_id, current);
  }

  const staffMembers = teamRows.filter((row): row is TeamRow => Boolean(row));

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-black mb-1">Team Access</h1>
        <p className="text-sm text-muted-foreground">
          Only explicitly added staff members appear here.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="text-lg font-bold text-black mb-4">Add staff member</h2>
        <form action={addStaffByEmail} className="flex flex-wrap items-center gap-3">
          <input
            type="email"
            name="email"
            placeholder="Staff email address"
            className="min-w-[280px] rounded-md border border-border px-3 py-2 text-sm"
            required
          />
          <select
            name="role"
            defaultValue="sales"
            className="rounded-md border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="sales">Sales</option>
            <option value="admin">Admin</option>
          </select>
          <select
            name="is_approved"
            defaultValue="false"
            className="rounded-md border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="false">Pending</option>
            <option value="true">Approved</option>
          </select>
          <button type="submit" className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white">
            Add staff
          </button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          The email must belong to a user who has already signed in once, so they exist in `profiles`.
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
            {staffMembers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                  No staff members added yet.
                </td>
              </tr>
            ) : (
              staffMembers.map((member) => {
                const stat = metrics.get(member.id) ?? { total: 0, verified: 0, edits: 0 };
                return (
                  <tr key={member.id} className="hover:bg-muted/40">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-black">{member.full_name || "Unnamed user"}</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{member.email || "-"}</td>
                    <td className="px-6 py-4">
                      <form action={saveStaffAccess} className="flex items-center gap-2">
                        <input type="hidden" name="user_id" value={member.id} />
                        <select
                          name="role"
                          defaultValue={member.role}
                          className="rounded-md border border-border bg-white px-2 py-1 text-xs"
                        >
                          <option value="sales">Sales</option>
                          <option value="admin">Admin</option>
                        </select>
                        <select
                          name="is_approved"
                          defaultValue={String(member.is_approved)}
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
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          member.is_approved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {member.is_approved ? "Approved" : "Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {stat.total} actions · {stat.edits} edits · {stat.verified} verifies
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/team/${member.id}`} className="text-primary hover:underline font-medium text-xs">
                        Open full profile
                      </Link>
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
