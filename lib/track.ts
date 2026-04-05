import { logError } from "@/lib/logError";

export async function track(
  event: string,
  options?: {
    path?: string;
    role?: string | null;
    meta?: Record<string, unknown>;
  }
) {
  try {
    const res = await fetch("/api/analytics/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event,
        path: options?.path ?? window.location.pathname,
        role: options?.role ?? null,
        meta: options?.meta ?? {},
      }),
      keepalive: true,
    });

    if (!res.ok) {
      const text = await res.text();

      console.error("Analytics track failed:", res.status, text);

      await logError("Analytics track failed", {
        source: "client",
        area: "analytics",
        role: options?.role ?? null,
        details: {
          status: res.status,
          responseText: text,
          event,
          meta: options?.meta ?? {},
        },
      });

      return;
    }

    console.log("Analytics tracked:", event);
  } catch (error: any) {
    console.error("Analytics track error:", error);

    await logError("Analytics track request error", {
      source: "client",
      area: "analytics",
      role: options?.role ?? null,
      details: {
        event,
        meta: options?.meta ?? {},
        errorMessage: error?.message ?? String(error),
      },
    });
  }
}