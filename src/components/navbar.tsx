import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/auth/user-menu";
import { IntentLink } from "@/components/intent-link";
import type { Tables } from "@/types/supabase";

type NavbarProfile = Pick<Tables<"profiles">, "full_name" | "avatar_url" | "email">;

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profileData } = user
    ? await supabase
      .from("profiles")
      .select("full_name, avatar_url, email")
      .eq("id", user.id)
      .maybeSingle()
    : { data: null };
  const profile = (profileData as NavbarProfile | null) ?? null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:h-20 md:px-10">
        <IntentLink href="/" className="flex items-center gap-2 group">
          <Image
            src="/logo.png"
            alt="LibraryNear Logo"
            width={132}
            height={40}
            className="h-8 w-auto object-contain shrink-0 md:h-10"
            priority
          />
          <span className="text-2xl tracking-tight hidden sm:block">
            <span className="text-primary/80 font-semibold text-[22px]">Library</span><span className="text-primary font-bold text-[22px]">Near</span>
          </span>
        </IntentLink>

        <div className="flex items-center gap-2 md:gap-4">
          <IntentLink
            href="/for-owners"
            className="text-xs font-semibold rounded-full border border-primary text-primary hover:bg-primary/5 px-3 py-1.5 transition-colors md:px-4 md:text-[13px]"
          >
            List Your Library
          </IntentLink>
          <UserMenu
            user={
              user
                ? {
                  name:
                    profile?.full_name ??
                    (user.user_metadata?.full_name as string | undefined) ??
                    (user.user_metadata?.name as string | undefined) ??
                    null,
                  email: profile?.email ?? user.email ?? null,
                  avatarUrl:
                    profile?.avatar_url ??
                    (user.user_metadata?.avatar_url as string | undefined) ??
                    (user.user_metadata?.picture as string | undefined) ??
                    null,
                }
                : null
            }
          />
        </div>
      </div>
    </header>
  );
}
