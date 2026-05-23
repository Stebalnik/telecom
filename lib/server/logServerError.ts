import { createClient } from "@/lib/supabase/server";

type LogLevel = "info" | "warning" | "error" | "critical";
type LogSource = "frontend" | "api" | "db" | "auth" | "server" | "admin";

type LogServerErrorInput = {
  message: string;
  code?: string;
  level?: LogLevel;
  source?: LogSource;
  area?: string;
  path?: string | null;
  statusCode?: number;
  role?: string | null;
  details?: Record<string, unknown>;
};

const REDACTED = "[redacted]";
const MAX_STRING_LENGTH = 3000;
const MAX_ARRAY_ITEMS = 25;
const MAX_OBJECT_KEYS = 50;
const MAX_DEPTH = 4;

const SENSITIVE_DETAIL_KEYS = [
  "password",
  "token",
  "access_token",
  "refresh_token",
  "authorization",
  "api_key",
  "apikey",
  "apiKey",
  "service_role",
  "secret",
  "session",
  "cookie",
  "card",
  "stripe",
];

function isSensitiveKey(key: string) {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return SENSITIVE_DETAIL_KEYS.some((blocked) =>
    normalized.includes(blocked.toLowerCase().replace(/[^a-z0-9]/g, ""))
  );
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (value == null) return value;
  if (typeof value === "string") return value.slice(0, MAX_STRING_LENGTH);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message.slice(0, MAX_STRING_LENGTH),
    };
  }

  if (depth >= MAX_DEPTH) return "[max_depth]";

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    const entries = Object.entries(value as Record<string, unknown>).slice(
      0,
      MAX_OBJECT_KEYS
    );

    for (const [key, nestedValue] of entries) {
      result[key] = isSensitiveKey(key)
        ? REDACTED
        : sanitizeValue(nestedValue, depth + 1);
    }

    return result;
  }

  return String(value).slice(0, MAX_STRING_LENGTH);
}

export function sanitizeLogDetails(input: Record<string, unknown> | undefined) {
  const raw = input ?? {};
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    result[key] = isSensitiveKey(key) ? REDACTED : sanitizeValue(value, 0);
  }

  return result;
}

function buildFingerprint(input: {
  code?: string;
  source?: string;
  area?: string;
  message: string;
}) {
  return [input.code ?? "no_code", input.source ?? "unknown", input.area ?? "unknown", input.message]
    .join("|")
    .toLowerCase()
    .slice(0, 500);
}

export async function logServerError(input: LogServerErrorInput) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("error_logs").insert({
      user_id: user?.id ?? null,
      role: input.role ?? null,
      source: input.source ?? "server",
      area: input.area ?? null,
      message: input.message,
      details: sanitizeLogDetails(input.details),
      path: input.path ?? null,
      level: input.level ?? "error",
      code: input.code ?? null,
      status_code: input.statusCode ?? null,
      fingerprint: buildFingerprint({
        code: input.code,
        source: input.source,
        area: input.area,
        message: input.message,
      }),
    });
  } catch (e) {
    console.error("logServerError failed", {
      message: input.message,
      code: input.code ?? null,
      source: input.source ?? "server",
      area: input.area ?? null,
      details: sanitizeLogDetails(input.details),
      error: e instanceof Error ? e.message : "Unknown logging failure",
    });
  }
}
