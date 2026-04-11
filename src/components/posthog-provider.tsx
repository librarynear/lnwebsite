"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { usePathname, useSearchParams } from "next/navigation";

type IdleCallbackHandle = number;
type IdleCallback = (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void;

function PostHogPageView({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!enabled || !pathname) {
      return;
    }

    let url = window.origin + pathname;
    if (searchParams && searchParams.toString()) {
      url = `${url}?${searchParams.toString()}`;
    }

    posthog.capture("$pageview", {
      $current_url: url,
    });
  }, [enabled, pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
  const initStartedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!key || process.env.NODE_ENV !== "production" || initStartedRef.current) {
      return;
    }

    initStartedRef.current = true;
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleCallback, options?: { timeout: number }) => IdleCallbackHandle;
      cancelIdleCallback?: (handle: IdleCallbackHandle) => void;
    };

    const init = () => {
      posthog.init(key, {
        api_host: host,
        person_profiles: "always",
        capture_pageview: false,
        capture_pageleave: true,
        session_recording: {
          recordCrossOriginIframes: false,
        },
      });
      setIsReady(true);
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      const idleHandle = idleWindow.requestIdleCallback(() => init(), { timeout: 2000 });

      return () => {
        idleWindow.cancelIdleCallback?.(idleHandle);
      };
    }

    const timeoutId = globalThis.setTimeout(init, 1200);
    return () => globalThis.clearTimeout(timeoutId);
  }, [host, key]);

  if (!key || process.env.NODE_ENV !== "production") {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView enabled={isReady} />
      </Suspense>
      {children}
    </PHProvider>
  );
}
