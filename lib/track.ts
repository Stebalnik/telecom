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

    // analytics is intentionally non-blocking
    if (!res.ok) {
      return;
    }
  } catch {
    // ignore transient network/dev reload failures
  }
}