import { CheckCircle2, Clock3, MapPin, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { IntentLink } from "@/components/intent-link";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Input } from "@/components/ui/input";
import { submitOwnerLibrary } from "@/app/for-owners/actions";
import { OwnerFeePlansInput } from "@/app/for-owners/owner-fee-plans-input";
import { upsertProfileFromUser } from "@/lib/auth/profile";
import { logPerf, measureAsync } from "@/lib/perf";

const AMENITY_OPTIONS = [
  "AC",
  "Wi-Fi",
  "RO Water",
  "Washroom",
  "Power Backup",
  "CCTV",
  "Locker",
  "Parking",
  "Tea/Coffee",
  "Security Guard",
  "Charging Points",
  "Silent Zone",
];

type OwnerSubmissionRow = {
  id: string;
  status: string;
  display_name: string;
  city: string;
  locality: string | null;
  created_at: string | null;
};

export const metadata = {
  title: "For Owners",
  description: "List your study library on LibraryNear and reach nearby students.",
};

function statusLabel(status: string) {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Needs changes";
    default:
      return "Under review";
  }
}

export default async function ForOwnersPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; error?: string }>;
}) {
  const { submitted, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await upsertProfileFromUser(user);
  }

  const submissionsMeasurement = user
    ? await measureAsync("ownerSubmissions", async () =>
        (
          await supabase
            .from("owner_library_submissions")
            .select("id, status, display_name, city, locality, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
        ).data ?? [],
      )
    : null;
  const submissions = submissionsMeasurement?.result ?? [];

  if (submissionsMeasurement) {
    logPerf("forOwners", [submissionsMeasurement.metric], `user=1 submissions=${submissions.length}`);
  }

  return (
    <div className="bg-slate-50/50">
      <section className="bg-[#0F74C5]">
        <div className="container mx-auto grid gap-10 px-6 py-14 md:grid-cols-[1.15fr_0.85fr] md:px-10 md:py-18">
          <div>
            <h1 className="mt-5 max-w-2xl text-4xl font-bold tracking-tight text-white md:text-5xl">
              Bring your library in front of students who are already searching nearby.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/80 md:text-lg">
              Sign in once with Google, submit your library details, and we will review it before it goes live.
              That keeps the platform trustworthy for students and smooth for owners.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <a
                  href="#owner-form"
                  className="inline-flex items-center rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-[#0F74C5] transition-colors hover:bg-white/90 shadow-sm"
                >
                  Start listing now
                </a>
              ) : (
                <GoogleLoginButton
                  next="/for-owners"
                  className="inline-flex items-center rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-[#0F74C5] transition-colors hover:bg-white/90 shadow-sm"
                >
                  Continue with Google
                </GoogleLoginButton>
              )}
              <IntentLink
                href="/profile"
                className="inline-flex items-center rounded-full border border-white/30 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                View account
              </IntentLink>
            </div>
          </div>

          <div className="grid gap-4 self-start rounded-3xl border border-border bg-white p-6 shadow-sm">
            {[
              {
                icon: ShieldCheck,
                title: "Verified onboarding",
                body: "Every owner listing stays under our review first, so low-quality or duplicate entries do not hit the public site.",
              },
              {
                icon: Clock3,
                title: "Fast approval flow",
                body: "Once approved, your listing will go live immediately.",
              },
              {
                icon: MapPin,
                title: "Local discovery",
                body: "Students can find your library by locality, metro station, and nearby distance.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-base font-semibold text-black">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-12 md:px-10">
        {!user ? (
          <div className="mx-auto max-w-2xl rounded-3xl border border-border/60 bg-white p-10 text-center shadow-xl shadow-black/5">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#E5EDF4] text-primary">
              <ShieldCheck className="h-8 w-8" strokeWidth={2} />
            </div>
            <h2 className="text-3xl font-bold text-[#0F74C5]">Sign in before listing your library</h2>
            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              We use one secure Google sign-in for everyone. This allows owners to safely track their submissions and prevents fake listings on our platform.
            </p>
            <GoogleLoginButton
              next="/for-owners"
              className="mx-auto mt-8 inline-flex items-center rounded-full bg-[#0F74C5] px-8 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-black/10 transition-transform hover:-translate-y-0.5 hover:bg-[#0F74C5]/90"
            >
              Continue with Google to list your library
            </GoogleLoginButton>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div
              id="owner-form"
              className="rounded-3xl border-0 bg-white p-6 shadow-md md:p-8"
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-black">Submit your library</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Fill in the essentials. We will review the submission and keep you posted in your account.
                </p>
              </div>

              {submitted === "1" && (
                <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Your library submission is in review. We will surface it in your owner dashboard below.
                </div>
              )}

              {error && (
                <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  We could not submit your listing just yet. Please review the required fields and try again.
                </div>
              )}

              <form action={submitOwnerLibrary} className="grid gap-5">
                <div className="border-b border-border pb-2">
                  <h3 className="text-sm font-semibold text-black">Core Details</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="display_name" className="text-sm font-medium text-black">Display name</label>
                    <Input id="display_name" name="display_name" placeholder="Example Library, Rajendra Nagar" className="rounded-2xl border-border/80 bg-slate-50/50 shadow-sm focus-visible:ring-primary/30" required />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="locality" className="text-sm font-medium text-black">Locality</label>
                    <Input id="locality" name="locality" placeholder="Mukherjee Nagar" className="rounded-2xl border-border/80 bg-slate-50/50 shadow-sm focus-visible:ring-primary/30" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="city" className="text-sm font-medium text-black">City</label>
                    <Input id="city" name="city" defaultValue="Delhi" className="rounded-2xl border-border/80 bg-slate-50/50 shadow-sm focus-visible:ring-primary/30" required />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="district" className="text-sm font-medium text-black">District</label>
                    <Input id="district" name="district" className="rounded-2xl border-border/80 bg-slate-50/50 shadow-sm focus-visible:ring-primary/30" />
                  </div>
                </div>

                <div className="border-b border-border pb-2 pt-2">
                  <h3 className="text-sm font-semibold text-black">Location Details</h3>
                </div>
                <div className="space-y-2">
                  <label htmlFor="full_address" className="text-sm font-medium text-black">Full address</label>
                  <textarea
                    id="full_address"
                    name="full_address"
                    rows={3}
                    placeholder="House number, street, landmark, locality"
                    className="w-full rounded-2xl border border-border/80 bg-slate-50/50 shadow-sm px-3 py-2 text-sm outline-none transition-colors focus-visible:border-primary/50 focus-visible:ring-3 focus-visible:ring-primary/30"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label htmlFor="state" className="text-sm font-medium text-black">State</label>
                    <Input id="state" name="state" defaultValue="Delhi" className="rounded-2xl border-border/80 bg-slate-50/50 shadow-sm focus-visible:ring-primary/30" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="pin_code" className="text-sm font-medium text-black">PIN code</label>
                    <Input id="pin_code" name="pin_code" className="rounded-2xl border-border/80 bg-slate-50/50 shadow-sm focus-visible:ring-primary/30" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="nearest_metro" className="text-sm font-medium text-black">Nearest metro</label>
                    <Input id="nearest_metro" name="nearest_metro" placeholder="Rajendra Place" className="rounded-2xl border-border/80 bg-slate-50/50 shadow-sm focus-visible:ring-primary/30" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="nearest_metro_distance_km" className="text-sm font-medium text-black">Metro distance (KM)</label>
                    <Input id="nearest_metro_distance_km" name="nearest_metro_distance_km" type="number" step="0.01" placeholder="e.g. 1.2" className="rounded-2xl border-border/80 bg-slate-50/50 shadow-sm focus-visible:ring-primary/30" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="map_link" className="text-sm font-medium text-black">Google Maps link</label>
                    <Input id="map_link" name="map_link" placeholder="https://maps.google.com/..." className="rounded-2xl border-border/80 bg-slate-50/50 shadow-sm focus-visible:ring-primary/30" />
                    <p className="text-xs text-muted-foreground">
                      If the link contains coordinates, we will extract latitude and longitude automatically.
                    </p>
                  </div>
                </div>

                <div className="border-b border-border pb-2 pt-2">
                  <h3 className="text-sm font-semibold text-black">Facilities & Logistics</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="opening_time" className="text-sm font-medium text-black">Opening time</label>
                    <Input id="opening_time" name="opening_time" type="time" className="rounded-2xl border-border/80 bg-slate-50/50 shadow-sm focus-visible:ring-primary/30" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="closing_time" className="text-sm font-medium text-black">Closing time</label>
                    <Input id="closing_time" name="closing_time" type="time" className="rounded-2xl border-border/80 bg-slate-50/50 shadow-sm focus-visible:ring-primary/30" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label htmlFor="phone_number" className="text-sm font-medium text-black">Phone</label>
                    <Input id="phone_number" name="phone_number" placeholder="10-digit mobile number" className="rounded-2xl border-border/80 bg-slate-50/50 shadow-sm focus-visible:ring-primary/30" required />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="whatsapp_number" className="text-sm font-medium text-black">WhatsApp</label>
                    <Input id="whatsapp_number" name="whatsapp_number" className="rounded-2xl border-border/80 bg-slate-50/50 shadow-sm focus-visible:ring-primary/30" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="total_seats" className="text-sm font-medium text-black">Seats</label>
                    <Input id="total_seats" name="total_seats" type="number" min="0" className="rounded-2xl border-border/80 bg-slate-50/50 shadow-sm focus-visible:ring-primary/30" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="amenities" className="text-sm font-medium text-black">Amenities</label>
                  <select
                    id="amenities"
                    name="amenities"
                    multiple
                    className="min-h-36 w-full rounded-2xl border border-border/80 bg-slate-50/50 px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:border-primary/50 focus-visible:ring-3 focus-visible:ring-primary/30"
                  >
                    {AMENITY_OPTIONS.map((amenity) => (
                      <option key={amenity} value={amenity}>
                        {amenity}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Hold Ctrl or Cmd to select multiple amenities.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium text-black">Short description</label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    placeholder="Tell students what makes your library a great place to study."
                    className="w-full rounded-2xl border border-border/80 bg-slate-50/50 shadow-sm px-3 py-2 text-sm outline-none transition-colors focus-visible:border-primary/50 focus-visible:ring-3 focus-visible:ring-primary/30"
                  />
                </div>

                <OwnerFeePlansInput />

                <div className="space-y-2">
                  <label htmlFor="photos" className="text-sm font-medium text-black">Photos</label>
                  <Input
                    id="photos"
                    name="photos"
                    type="file"
                    accept="image/*"
                    multiple
                    className="h-auto rounded-2xl border-border/80 bg-slate-50/50 py-2 shadow-sm focus-visible:ring-primary/30"
                  />
                  <p className="text-xs text-muted-foreground">
                    Add a few clear photos of seating, entrance, and study area. These stay under review until approval.
                  </p>
                </div>

                <FormSubmitButton className="mt-4 h-12 w-full md:w-auto rounded-full bg-[#0F74C5] hover:bg-[#0F74C5]/90 px-8 text-sm font-semibold shadow-md">
                  Submit for review
                </FormSubmitButton>
              </form>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border-0 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <h3 className="text-lg font-bold text-black">What happens next</h3>
                <div className="mt-4 space-y-4">
                  {[
                    "We review your details before the library appears publicly.",
                    "If something is missing, you will see it in your owner dashboard instead of silently failing.",
                    "Once approved, the listing can go live quickly through our cached public pages.",
                  ].map((item) => (
                    <div key={item} className="flex gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
                      <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border-0 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-black">Your submissions</h3>
                  <IntentLink href="/profile" className="text-sm font-medium text-primary hover:underline">
                    Open profile
                  </IntentLink>
                </div>
                {submissions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    You have not submitted a library yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(submissions as OwnerSubmissionRow[]).map((submission) => (
                      <div key={submission.id} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-black">{submission.display_name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {[submission.locality, submission.city].filter(Boolean).join(", ")}
                            </p>
                          </div>
                          <span className="rounded-full bg-primary/8 px-3 py-1 text-xs font-semibold text-primary">
                            {statusLabel(submission.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
