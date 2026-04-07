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

function sanitizeDetails(input: Record<string, unknown> | undefined) {
  const raw = input ?? {};
  const blocked = ["password", "token", "access_token", "refresh_token", "authorization", "apiKey", "service_role", "card"];
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (blocked.some((b) => key.toLowerCase().includes(b))) continue;
    result[key] = typeof value === "string" ? value.slice(0, 3000) : value;
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
      details: sanitizeDetails(input.details),
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
    console.error("logServerError failed", e);
  }
}