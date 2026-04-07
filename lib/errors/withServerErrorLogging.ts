import { normalizeError } from "@/lib/errors/normalizeError";
import { logServerError } from "@/lib/server/logServerError";

type ServerErrorSource = "api" | "server" | "db" | "auth" | "admin";
type ServerLogLevel = "info" | "warning" | "error" | "critical";

type WithServerErrorLoggingOptions = {
  message: string;
  code: string;
  source?: ServerErrorSource;
  area?: string;
  role?: string | null;
  path?: string;
  level?: ServerLogLevel;
  statusCode?: number;
  details?: Record<string, unknown>;
};

export async function withServerErrorLogging<T>(
  fn: () => Promise<T>,
  options: WithServerErrorLoggingOptions
): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    const normalized = normalizeError(
      error,
      options.code,
      options.message || "Unexpected server error"
    );

    void logServerError({
      message: options.message,
      code: normalized.code ?? options.code,
      source: options.source ?? "server",
      area: options.area,
      role: options.role ?? null,
      path: options.path ?? null,
      level: options.level ?? "error",
      statusCode: options.statusCode ?? normalized.statusCode,
      details: {
        ...(options.details ?? {}),
        message: normalized.message,
        originalCode: normalized.code ?? null,
        originalDetails: normalized.details ?? null,
      },
    }).catch(() => undefined);

    throw normalized;
  }
}