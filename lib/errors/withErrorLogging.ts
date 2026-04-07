import { logError } from "../logError";
import { normalizeError } from "./normalizeError";

type ErrorSource = "frontend" | "api" | "admin";
type ErrorLevel = "info" | "warning" | "error" | "critical";

type AppError = Error & {
  code?: string;
  details?: Record<string, unknown>;
  statusCode?: number;
};

type WithErrorLoggingParams = {
  message: string;
  code: string;
  source: ErrorSource;
  area: string;
  path: string;
  role?: string | null;
  level?: ErrorLevel;
  statusCode?: number;
  details?: Record<string, unknown>;
};

export async function withErrorLogging<T>(
  action: () => Promise<T>,
  params: WithErrorLoggingParams
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    const normalized = normalizeError(error) as AppError;

    void logError(params.message, {
      source: params.source,
      area: params.area,
      role: params.role ?? undefined,
      path: params.path,
      code: params.code,
      level: params.level ?? "error",
      statusCode: params.statusCode ?? normalized.statusCode ?? undefined,
      details: {
        ...params.details,
        message: normalized.message,
        originalCode: normalized.code ?? null,
        originalDetails: normalized.details ?? null,
      },
    });

    throw normalized;
  }
}