"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

// Central event tracker — import and call anywhere in client components
export const track = posthog.capture.bind(posthog);

// Tracks full page-level events
export function PageAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.get("q");
    const locality = searchParams.get("locality");

    if (pathname === "/") {
      posthog.capture("home_view");
    } else if (pathname.endsWith("/libraries")) {
      if (q) posthog.capture("search_submitted", { query: q, locality });
    } else if (pathname.includes("/library/")) {
      posthog.capture("detail_viewed", { slug: pathname.split("/").pop() });
    } else if (pathname.includes("/locality/")) {
      posthog.capture("locality_page_viewed", { slug: pathname.split("/").pop() });
    }
  }, [pathname, searchParams]);

  return null;
}
