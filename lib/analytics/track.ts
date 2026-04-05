import type { AnalyticsEventName } from "./events";

type TrackOptions = {
  path?: string;
  role?: string | null;
  meta?: Record<string, unknown>;
};

export async function track(
  event: AnalyticsEventName,
  options?: TrackOptions
) {
  try {
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event,
        path:
          options?.path ??
          (typeof window !== "undefined" ? window.location.pathname : null),
        role: options?.role ?? null,
        meta: options?.meta ?? {},
      }),
      keepalive: true,
    });
  } catch {
    // analytics must never break UI
  }
}