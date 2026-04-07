type ClientLogLevel = "info" | "warning" | "error" | "critical";

export async function logError(
  message: string,
  options?: {
    source?: "frontend" | "api" | "admin";
    area?: string;
    path?: string;
    role?: string | null;
    code?: string;
    level?: ClientLogLevel;
    statusCode?: number;
    details?: Record<string, unknown>;
  }
) {
  const path =
    options?.path ??
    (typeof window !== "undefined" ? window.location.pathname : null);

  const payload = {
    source: options?.source ?? "frontend",
    area: options?.area ?? null,
    message,
    path,
    role: options?.role ?? null,
    code: options?.code ?? null,
    level: options?.level ?? "error",
    statusCode: options?.statusCode ?? null,
    details: options?.details ?? {},
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : null,
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch("/api/errors/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");

      // fallback — не спамим, но оставляем trace
      console.error("logError failed:", res.status, text);
    }
  } catch (error: any) {
    // fallback — никогда не ломаем UI
    console.error("logError request exception:", {
      message,
      error: error?.message,
    });
  }
}