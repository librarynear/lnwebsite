import { notFound } from "next/navigation";
import { FormSubmitButton } from "@/components/form-submit-button";
import { requireApprovedStaff } from "@/lib/staff-access";
import { supabaseServer } from "@/lib/supabase-server";
import { assignLocality, removeLocalityAssignment, saveStaffAccess } from "../actions";
import { AssignmentForm } from "./assignment-form";

function formatActionType(actionType: string) {
  switch (actionType) {
    case "library_updated":
      return "Library details updated";
    case "verification_updated":
      return "Verification status changed";
    default:
      return actionType.replace(/_/g, " ");
  }
}

function formatFieldName(field: string) {
  return field
    .replace(/^last_/, "")
    .replace(/_id$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function AdminTeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireApprovedStaff(["admin"]);
  const { id } = await params;

  const [{ data: profile }, { data: staff }, { data: assignments }, { data: activityLogs }, { data: localityRows }] =
    await Promise.all([
    supabaseServer.from("profiles").select("*").eq("id", id).maybeSingle(),
    supabaseServer.from("staff_users").select("*").eq("user_id", id).maybeSingle(),
    supabaseServer.from("sales_locality_assignments").select("*").eq("user_id", id).order("city"),
    supabaseServer.from("library_activity_logs").select("*").eq("actor_user_id", id).order("created_at", { ascending: false }).limit(25),
    supabaseServer
      .from("library_branches")
      .select("city, locality")
      .not("city", "is", null)
      .not("locality", "is", null)
      .order("city")
      .order("locality"),
  ]);

  if (!profile) notFound();

  const totalActions = (activityLogs ?? []).length;
  const verifiedActions = (activityLogs ?? []).filter((item) => item.action_type === "verification_updated").length;
  const editActions = (activityLogs ?? []).filter((item) => item.action_type === "library_updated").length;
  const assignmentOptions = Array.from(
    new Map(
      (localityRows ?? [])
        .filter((row) => row.city && row.locality)
        .map((row) => [`${row.city}::${row.locality}`, { city: row.city!, locality: row.locality! }]),
    ).values(),
  );

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
            <FormSubmitButton
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
              pendingLabel="Saving..."
            >
              Save access
            </FormSubmitButton>
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
          <AssignmentForm
            userId={profile.id}
            options={assignmentOptions}
            existingAssignments={(assignments ?? []).map((assignment) => ({
              city: assignment.city,
              locality: assignment.locality,
            }))}
            action={assignLocality}
          />

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
                    <FormSubmitButton
                      className="h-auto rounded-none border-0 bg-transparent px-0 py-0 text-rose-600 shadow-none hover:underline"
                      pendingLabel="Removing..."
                    >
                      Remove
                    </FormSubmitButton>
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
              <div key={log.id} className="rounded-lg border border-border px-4 py-4 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-black">{formatActionType(log.action_type)}</p>
                    {log.verification_status ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Set status to <span className="font-medium text-black">{log.verification_status === "verified" ? "Verified" : "Not Verified"}</span>
                      </p>
                    ) : null}
                    {log.changed_fields?.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {log.changed_fields
                          .filter((field) => !field.startsWith("last_"))
                          .map((field) => (
                            <span
                              key={field}
                              className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                            >
                              {formatFieldName(field)}
                            </span>
                          ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No field list recorded</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
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
