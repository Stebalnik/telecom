import { logError } from "@/lib/logError";

export async function track(
  event: string,
  options?: {
    path?: string;
    role?: string | null;
    meta?: Record<string, unknown>;
  }
) {
  const path =
    options?.path ??
    (typeof window !== "undefined" ? window.location.pathname : null);

  try {
    const res = await fetch("/api/analytics/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event,
        path,
        role: options?.role ?? null,
        meta: options?.meta ?? {},
      }),
      keepalive: true,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");

      await logError("analytics_track_failed", {
        source: "frontend",
        area: "analytics",
        role: options?.role ?? null,
        path: path ?? undefined,
        code: "analytics_track_failed",
        details: {
          status: res.status,
          responseText: text,
          event,
          meta: options?.meta ?? {},
        },
      });

      return;
    }
  } catch (error: any) {
    await logError("analytics_track_request_failed", {
      source: "frontend",
      area: "analytics",
      role: options?.role ?? null,
      path: path ?? undefined,
      code: "analytics_track_request_failed",
      details: {
        event,
        meta: options?.meta ?? {},
        errorMessage: error?.message ?? String(error),
      },
    });
  }
}