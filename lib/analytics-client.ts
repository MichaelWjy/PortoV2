/** Fire-and-forget analytics beacon. Respects Do Not Track / Global Privacy Control in the browser too. */
export function track(type: "PAGE_VIEW" | "PROJECT_VIEW" | "MILESTONE_VIEW", path: string, extra: { projectSlug?: string } = {}) {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.doNotTrack === "1" || nav.globalPrivacyControl) return;
  const body = JSON.stringify({ type, path, referrer: document.referrer || undefined, ...extra });
  try {
    if (!navigator.sendBeacon?.("/api/analytics", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/analytics", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => undefined);
    }
  } catch {
    // Analytics must never break the page.
  }
}
