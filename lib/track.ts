export async function track(
  event: string,
  options?: {
    path?: string;
    role?: string | null;
    meta?: Record<string, unknown>;
  }
) {
  try {
    await fetch("/api/analytics/track", {
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
  } catch {
    // ignore analytics errors
  }
}