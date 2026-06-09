import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 md:px-12">
        <div className="text-2xl font-heading font-bold text-primary">
          FocusDesk
        </div>
        <div className="flex gap-4 items-center">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="text-sm font-medium hover:text-primary transition-colors py-2">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                Register
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton afterSignOutUrl="/" />
          </Show>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center pb-20">
        <h1 className="text-5xl md:text-7xl font-heading font-bold text-foreground mb-6 max-w-4xl leading-tight">
          Find Your Perfect Study Space
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl">
          Book seats at the best libraries near you. Whether you need a quiet corner for an hour or a dedicated desk for the month, we've got you covered.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mx-auto">
          <Link href="/libraries" className="flex-1 bg-primary text-primary-foreground font-semibold py-3 px-6 rounded-xl hover:opacity-90 transition-opacity text-lg text-center">
            Find a Library
          </Link>
          <Link href="/onboarding" className="flex-1 bg-card text-foreground border border-border font-semibold py-3 px-6 rounded-xl hover:bg-muted transition-colors text-lg text-center">
            List Your Library
          </Link>
        </div>
      </main>
    </div>
  );
}
