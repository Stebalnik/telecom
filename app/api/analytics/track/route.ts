import { NextResponse } from "next/server";
import { unwrapSupabase } from "@/lib/errors/unwrapSupabase";
import { withServerErrorLogging } from "@/lib/errors/withServerErrorLogging";
import { createClient } from "@/lib/supabase/server";

type TrackBody = {
  event?: string;
  path?: string;
  role?: string | null;
  meta?: Record<string, unknown>;
};

export async function POST(req: Request) {
  try {
    return await withServerErrorLogging(
      async () => {
        const body = (await req.json()) as TrackBody;

        const event = body.event?.trim();
        const path = body.path?.trim() || null;
        const role = body.role?.trim() || null;
        const meta = body.meta ?? {};

        if (!event) {
          return NextResponse.json(
            { error: "event is required" },
            { status: 400 }
          );
        }

        const supabase = await createClient();

        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr) {
          return NextResponse.json(
            { error: "Unable to verify user." },
            { status: 401 }
          );
        }

        unwrapSupabase(
          await supabase.from("analytics_events").insert({
            user_id: user?.id ?? null,
            event,
            path,
            role,
            meta,
          }),
          "analytics_track_failed",
          "Unable to track analytics event."
        );

        return NextResponse.json({ ok: true });
      },
      {
        message: "analytics_track_failed",
        code: "analytics_track_failed",
        source: "api",
        area: "analytics",
        path: "/api/analytics/track",
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to track analytics event." },
      { status: 500 }
    );
  }
}