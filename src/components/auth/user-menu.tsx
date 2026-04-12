"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Heart, LogOut, PlusSquare, User2 } from "lucide-react";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { signOutUser } from "@/app/auth/actions";

type UserMenuProps = {
  user: {
    name: string | null;
    email: string | null;
    avatarUrl: string | null;
  } | null;
};

function AvatarVisual({
  name,
  avatarUrl,
  loggedIn,
}: {
  name: string | null;
  avatarUrl: string | null;
  loggedIn: boolean;
}) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name ?? "User profile"}
        fill
        className="object-cover"
        sizes="40px"
      />
    );
  }

  if (loggedIn && name) {
    return (
      <span className="text-sm font-bold text-primary">
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }

  return <User2 className="h-4 w-4 text-slate-600" />;
}

export function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const loggedIn = Boolean(user);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 rounded-full border border-border bg-white px-1.5 py-1 shadow-sm transition-colors hover:bg-muted/40"
        aria-label={loggedIn ? "Open account menu" : "Sign in with Google"}
        aria-expanded={open}
      >
        <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_top,#e0e7ff_0%,#bfdbfe_38%,#eff6ff_100%)] ring-1 ring-black/5">
          <AvatarVisual
            name={user?.name ?? null}
            avatarUrl={user?.avatarUrl ?? null}
            loggedIn={loggedIn}
          />
        </div>
        <ChevronDown className="mr-1 h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-72 rounded-2xl border border-border bg-white p-2 shadow-[0_18px_40px_-16px_rgba(15,23,42,0.3)]">
          {loggedIn ? (
            <>
              <div className="flex items-center gap-3 rounded-xl px-3 py-3">
                <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-black/5">
                  <AvatarVisual
                    name={user?.name ?? null}
                    avatarUrl={user?.avatarUrl ?? null}
                    loggedIn
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-black">
                    {user?.name ?? "Your account"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="my-2 h-px bg-border" />

              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-black transition-colors hover:bg-muted/60"
              >
                <User2 className="h-4 w-4 text-muted-foreground" />
                Profile
              </Link>
              <Link
                href="/saved"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-black transition-colors hover:bg-muted/60"
              >
                <Heart className="h-4 w-4 text-muted-foreground" />
                Saved libraries
              </Link>
              <Link
                href="/for-owners"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-black transition-colors hover:bg-muted/60"
              >
                <PlusSquare className="h-4 w-4 text-muted-foreground" />
                My listings
              </Link>

              <div className="my-2 h-px bg-border" />

              <form action={signOutUser}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-black transition-colors hover:bg-muted/60"
                >
                  <LogOut className="h-4 w-4 text-muted-foreground" />
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <div className="rounded-xl p-3">
              <p className="text-sm font-semibold text-black">Create your LibraryNear account</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Save libraries across devices and list your own library with one Google sign-in.
              </p>
              <GoogleLoginButton
                next="/profile"
                className="mt-4 flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              >
                Continue with Google
              </GoogleLoginButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
