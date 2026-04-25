import { Search } from "lucide-react";
import { login } from "@/app/admin/actions";

export const metadata = {
  title: "Staff Access",
  description: "Private access for LibraryNear staff.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function StaffAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl items-center justify-center px-6 py-12 md:px-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
            <Search className="h-6 w-6" strokeWidth={3} />
          </div>
          <h1 className="text-2xl font-bold text-black">Staff access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Private sign-in for the LibraryNear operations dashboard.
          </p>
        </div>

        <form className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-black" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-xl border border-input px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-black" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-xl border border-input px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Enter your password"
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <button
            formAction={login}
            className="mt-2 w-full rounded-xl bg-black py-3 font-medium text-white transition-colors hover:bg-black/90"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
