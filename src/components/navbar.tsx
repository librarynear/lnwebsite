import Image from "next/image";
import { AuthMenuClient } from "@/components/auth/auth-menu-client";
import { IntentLink } from "@/components/intent-link";

export function Navbar() {
  return (
    <header className="navbar-sticky sticky top-0 z-50 w-full border-b border-border bg-white transition-transform duration-300 ease-in-out">
      <div className="container mx-auto relative flex h-16 items-center justify-between px-4 md:h-20 md:px-10">
        {/* Center Logo */}
        <IntentLink
          href="/"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center group shrink-0"
        >
          <Image
            src="/logo-icon.webp"
            alt="LibraryNear Logo"
            width={40}
            height={40}
            sizes="40px"
            className="h-8 w-auto object-contain shrink-0 sm:hidden"
            priority
          />
          <Image
            src="/logo.webp"
            alt="LibraryNear Logo"
            width={240}
            height={40}
            className="hidden sm:block h-8 w-auto object-contain shrink-0 md:h-10"
            priority
          />
        </IntentLink>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0 ml-auto">
          <IntentLink
            href="/for-owners"
            className="text-xs font-semibold rounded-full border border-primary text-primary hover:bg-primary/5 px-3 py-1.5 transition-colors md:px-4 md:text-[13px]"
          >
            List Your Library
          </IntentLink>
          <AuthMenuClient />
        </div>
      </div>
    </header>
  );
}
