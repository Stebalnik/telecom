export async function logError(
  message: string,
  options?: {
    source?: "client" | "server" | "api" | "admin";
    area?: string;
    path?: string;
    role?: string | null;
    details?: Record<string, unknown>;
  }
) {
  try {
    const res = await fetch("/api/errors/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: options?.source ?? "client",
        area: options?.area ?? null,
        message,
        path:
          options?.path ??
          (typeof window !== "undefined" ? window.location.pathname : null),
        role: options?.role ?? null,
        details: options?.details ?? {},
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : null,
      }),
      keepalive: true,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Error log write failed:", res.status, text);
    }
  } catch (error) {
    console.error("Error log request failed:", error);
  }
}