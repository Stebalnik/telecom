import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ErrorLogBody = {
  source?: string;
  area?: string | null;
  message?: string;
  details?: Record<string, unknown>;
  path?: string | null;
  role?: string | null;
  userAgent?: string | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ErrorLogBody;

    const source = body.source?.trim() || "client";
    const area = body.area?.trim() || null;
    const message = body.message?.trim();
    const details = body.details ?? {};
    const path = body.path?.trim() || null;
    const role = body.role?.trim() || null;
    const userAgent =
      body.userAgent?.trim() || req.headers.get("user-agent") || null;

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
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

    const { error } = await supabase.from("error_logs").insert({
      user_id: user?.id ?? null,
      role,
      source,
      area,
      message,
      details,
      path,
      user_agent: userAgent,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error logging failure" },
      { status: 500 }
    );
  }
}