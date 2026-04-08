import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  let body: TrackBody | null = null;

  try {
    body = (await req.json().catch(() => null)) as TrackBody | null;
  } catch {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const event = body?.event?.trim();
  const path = body?.path?.trim() || null;
  const role = body?.role?.trim() || null;
  const meta = sanitizeMeta(body?.meta);

  if (!event) {
    return NextResponse.json({ error: "event is required" }, { status: 400 });
  }

  try {
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

    const insertResult = await supabase.from("analytics_events").insert({
      user_id: userId,
      event,
      path,
      role,
      meta,
    });

    if (insertResult.error) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true, skipped: true });
  }
}