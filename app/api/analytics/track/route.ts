import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { unwrapSupabase } from "@/lib/errors/unwrapSupabase";
import { withServerErrorLogging } from "@/lib/errors/withServerErrorLogging";

type TrackBody = {
  event?: string;
  path?: string;
  role?: string | null;
  meta?: Record<string, unknown>;
};

function sanitizeMeta(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as TrackBody | null;

  const event = body?.event?.trim();
  const path = body?.path?.trim() || null;
  const role = body?.role?.trim() || null;
  const meta = sanitizeMeta(body?.meta);

  if (!event) {
    return NextResponse.json({ error: "event is required" }, { status: 400 });
  }

  try {
    await withServerErrorLogging(
      async () => {
        const supabase = await createClient();

        let userId: string | null = null;

        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          userId = user?.id ?? null;
        } catch {
          userId = null;
        }

        unwrapSupabase(
          await supabase.from("analytics_events").insert({
            user_id: userId,
            event,
            path,
            role,
            meta,
          }),
          "analytics_track_failed",
          "Unable to track analytics event."
        );
      },
      {
        message: "analytics_track_failed",
        code: "analytics_track_failed",
        source: "api",
        area: "analytics",
        path: "/api/analytics/track",
        details: {
          event,
          trackPath: path,
          role,
        },
      }
    );
  } catch {
    // analytics must stay non-blocking for UX
    return NextResponse.json({ ok: true, skipped: true });
  }

  return NextResponse.json({ ok: true });
}