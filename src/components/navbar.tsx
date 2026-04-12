import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/auth/user-menu";
import { IntentLink } from "@/components/intent-link";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name, avatar_url, email")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-white">
      <div className="container mx-auto flex h-20 items-center justify-between px-6 md:px-10">
        <IntentLink href="/" className="flex items-center gap-2 group">
          <Image
            src="/logo.png"
            alt="LibraryNear Logo"
            width={132}
            height={40}
            className="h-10 w-auto object-contain shrink-0"
            priority
          />
          <span className="text-2xl tracking-tight hidden sm:block">
            <span className="text-primary/80 font-semibold text-[22px]">Library</span><span className="text-primary font-bold text-[22px]">Near</span>
          </span>
        </IntentLink>

        <div className="flex items-center gap-4">
          <IntentLink
            href="/for-owners"
            className="text-[13px] font-semibold rounded-full border border-primary text-primary hover:bg-primary/5 px-4 py-1.5 transition-colors"
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
