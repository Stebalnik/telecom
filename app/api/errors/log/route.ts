import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type ErrorLogLevel = "info" | "warning" | "error" | "critical";
type ErrorLogSource = "frontend" | "api" | "db" | "auth" | "server" | "admin";

type ErrorLogBody = {
  source?: string;
  area?: string | null;
  message?: string;
  details?: Record<string, unknown>;
  path?: string | null;
  role?: string | null;
  userAgent?: string | null;
  level?: string;
  code?: string | null;
  statusCode?: number | null;
};

const ALLOWED_LEVELS: ErrorLogLevel[] = ["info", "warning", "error", "critical"];
const ALLOWED_SOURCES: ErrorLogSource[] = [
  "frontend",
  "api",
  "db",
  "auth",
  "server",
  "admin",
];

function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function safeTrim(value: unknown, max = 1000) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function normalizeLevel(value: unknown): ErrorLogLevel {
  if (
    typeof value === "string" &&
    ALLOWED_LEVELS.includes(value as ErrorLogLevel)
  ) {
    return value as ErrorLogLevel;
  }

  return "error";
}

function normalizeSource(value: unknown): ErrorLogSource {
  if (
    typeof value === "string" &&
    ALLOWED_SOURCES.includes(value as ErrorLogSource)
  ) {
    return value as ErrorLogSource;
  }

  return "frontend";
}

function sanitizeValue(value: unknown): unknown {
  if (value == null) return value;

  if (typeof value === "string") {
    return value.slice(0, 3000);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeValue(item));
  }

  if (typeof value === "object") {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(input)) {
      const lowerKey = key.toLowerCase();

      if (
        lowerKey.includes("password") ||
        lowerKey.includes("token") ||
        lowerKey.includes("authorization") ||
        lowerKey.includes("service_role") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("api_key") ||
        lowerKey.includes("apikey") ||
        lowerKey.includes("card") ||
        lowerKey.includes("cvv") ||
        lowerKey.includes("cvc")
      ) {
        continue;
      }

      output[key] = sanitizeValue(nestedValue);
    }

    return output;
  }

  return String(value).slice(0, 3000);
}

function sanitizeDetails(details: unknown) {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return {};
  }

  return sanitizeValue(details) as Record<string, unknown>;
}

function fingerprintOf(params: {
  code: string | null;
  source: ErrorLogSource;
  area: string | null;
  message: string;
}) {
  return [
    params.code ?? "no_code",
    params.source,
    params.area ?? "unknown",
    params.message,
  ]
    .join("|")
    .toLowerCase()
    .slice(0, 500);
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.json().catch(() => null);

    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const body = rawBody as ErrorLogBody;

    const message = safeTrim(body.message, 2000);
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const source = normalizeSource(body.source);
    const level = normalizeLevel(body.level);
    const area = safeTrim(body.area, 200) ?? null;
    const path = safeTrim(body.path, 1000) ?? null;
    const role = safeTrim(body.role, 100) ?? null;
    const code = safeTrim(body.code, 200) ?? null;
    const userAgent =
      safeTrim(body.userAgent, 1000) ??
      safeTrim(req.headers.get("user-agent"), 1000) ??
      null;

    const statusCode =
      typeof body.statusCode === "number" && Number.isFinite(body.statusCode)
        ? body.statusCode
        : null;

    const details = sanitizeDetails(body.details);

    const fingerprint = fingerprintOf({
      code,
      source,
      area,
      message,
    });

    const supabase = createServiceClient();

    const { error } = await supabase.from("error_logs").insert({
      user_id: null,
      role,
      source,
      area,
      message,
      details,
      path,
      user_agent: userAgent,
      level,
      code,
      status_code: statusCode,
      fingerprint,
    });

    if (error) {
      console.error("write_error_log_failed", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      return NextResponse.json(
        { error: "Unexpected error logging failure" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("error_log_route_failed", error);

    return NextResponse.json(
      { error: "Unexpected error logging failure" },
      { status: 500 }
    );
  }
}