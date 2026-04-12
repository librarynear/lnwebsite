import { notFound } from "next/navigation";
import { requireApprovedStaff } from "@/lib/staff-access";
import { supabaseServer } from "@/lib/supabase-server";
import { assignLocality, removeLocalityAssignment, saveStaffAccess } from "../actions";

export default async function AdminTeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireApprovedStaff(["admin"]);
  const { id } = await params;

  const [{ data: profile }, { data: staff }, { data: assignments }, { data: activityLogs }] = await Promise.all([
    supabaseServer.from("profiles").select("*").eq("id", id).maybeSingle(),
    supabaseServer.from("staff_users").select("*").eq("user_id", id).maybeSingle(),
    supabaseServer.from("sales_locality_assignments").select("*").eq("user_id", id).order("city"),
    supabaseServer.from("library_activity_logs").select("*").eq("actor_user_id", id).order("created_at", { ascending: false }).limit(25),
  ]);

  if (!profile) notFound();

  const totalActions = (activityLogs ?? []).length;
  const verifiedActions = (activityLogs ?? []).filter((item) => item.action_type === "verification_updated").length;
  const editActions = (activityLogs ?? []).filter((item) => item.action_type === "library_updated").length;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-black">{profile.full_name || "Unnamed user"}</h1>
        <p className="text-sm text-muted-foreground mt-1">{profile.email || "No email found"}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="text-lg font-bold text-black mb-4">Access control</h2>
          <form action={saveStaffAccess} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="user_id" value={profile.id} />
            <select name="role" defaultValue={staff?.role ?? "sales"} className="rounded-md border border-border bg-white px-3 py-2 text-sm">
              <option value="sales">Sales</option>
              <option value="admin">Admin</option>
            </select>
            <select name="is_approved" defaultValue={String(staff?.is_approved ?? false)} className="rounded-md border border-border bg-white px-3 py-2 text-sm">
              <option value="false">Pending</option>
              <option value="true">Approved</option>
            </select>
            <button type="submit" className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white">
              Save access
            </button>
          </form>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-muted-foreground">Total actions</p>
              <p className="text-xl font-bold text-black">{totalActions}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-muted-foreground">Edits</p>
              <p className="text-xl font-bold text-black">{editActions}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-muted-foreground">Verified</p>
              <p className="text-xl font-bold text-black">{verifiedActions}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="text-lg font-bold text-black mb-4">Locality assignments</h2>
          <form action={assignLocality} className="flex flex-wrap items-center gap-3 mb-4">
            <input type="hidden" name="user_id" value={profile.id} />
            <input name="city" placeholder="City" className="rounded-md border border-border px-3 py-2 text-sm" />
            <input name="locality" placeholder="Locality" className="rounded-md border border-border px-3 py-2 text-sm" />
            <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white">
              Assign
            </button>
          </form>

          <div className="space-y-2">
            {(assignments ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No assignments yet.</p>
            ) : (
              (assignments ?? []).map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span>{assignment.locality}, {assignment.city}</span>
                  <form action={removeLocalityAssignment}>
                    <input type="hidden" name="assignment_id" value={assignment.id} />
                    <input type="hidden" name="user_id" value={profile.id} />
                    <button type="submit" className="text-rose-600 hover:underline">
                      Remove
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="text-lg font-bold text-black mb-4">Recent activity</h2>
        <div className="space-y-3">
          {(activityLogs ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            (activityLogs ?? []).map((log) => (
              <div key={log.id} className="rounded-lg border border-border px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-black">{log.action_type}</p>
                    <p className="text-muted-foreground mt-1">
                      {log.changed_fields?.length ? `Fields: ${log.changed_fields.join(", ")}` : "No field list recorded"}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(log.created_at || "").toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
