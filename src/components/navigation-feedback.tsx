"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const MIN_VISIBLE_MS = 220;

function isInternalNavigationTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return false;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
    return false;
  }

  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false;

  const current = new URL(window.location.href);
  return url.pathname + url.search !== current.pathname + current.search;
}

export function NavigationFeedback() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const startedAtRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const startPending = () => {
      if (pending) return;
      startedAtRef.current = performance.now();
      setPending(true);
      document.body.classList.add("nav-pending");
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (isInternalNavigationTarget(event.target)) {
        startPending();
      }
    };

    const handlePopState = () => {
      startPending();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("popstate", handlePopState);
      document.body.classList.remove("nav-pending");
    };
  }, [pending]);

  useEffect(() => {
    if (!pending) return;

    const elapsed = performance.now() - startedAtRef.current;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setPending(false);
      document.body.classList.remove("nav-pending");
      timeoutRef.current = null;
    }, remaining);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [pathname, pending, searchParams]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 origin-left transition-opacity duration-150 ${
        pending ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className={`h-full w-full bg-[linear-gradient(90deg,#0F74C5_0%,#4BA3F8_40%,#93C5FD_100%)] ${
        pending ? "animate-[nav-progress_1.1s_ease-in-out_infinite]" : ""
      }`} />
    </div>
  );
}
