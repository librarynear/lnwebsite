import { login } from "../actions";
import { Search } from "lucide-react"; // Reusing an icon for brand

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-border">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 bg-primary text-white rounded-xl flex items-center justify-center mb-4">
            <Search className="h-6 w-6" strokeWidth={3} />
          </div>
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Access the Library Near management dashboard.
          </p>
        </div>

        <form className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-input focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-input focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          <button
            formAction={login}
            className="w-full bg-black hover:bg-black/90 text-white font-medium py-3 rounded-xl transition-colors mt-2"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
