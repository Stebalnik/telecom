import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type TrackBody = {
  event?: string;
  path?: string;
  role?: string | null;
  meta?: Record<string, unknown>;
};

export async function POST(req: Request) {
  try {
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
        { error: userErr.message },
        { status: 401 }
      );
    }

    const { error } = await supabase.from("analytics_events").insert({
      user_id: user?.id ?? null,
      event,
      path,
      role,
      meta,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected analytics error" },
      { status: 500 }
    );
  }
}