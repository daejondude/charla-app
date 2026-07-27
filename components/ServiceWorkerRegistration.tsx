"use client";

import { useEffect } from "react";

/**
 * Registers the service worker on mount. Renders nothing — this exists
 * purely for the side effect, so a browser that fails to register (or
 * doesn't support service workers at all) never affects the rest of the app.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      // Service workers and Next's dev server actively fight each other:
      // a cache-first SW can serve stale HTML referencing JS chunks that no
      // longer exist after a hot-reload, which breaks React hydration
      // silently — the page looks fine but nothing responds to clicks.
      // Actively unregister and clear any previously-installed SW/caches so
      // a machine that already hit this doesn't stay stuck.
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  }, []);

  return null;
}
