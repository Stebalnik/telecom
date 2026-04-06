import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase/server";

function asTrimmedString(value: unknown, max = 5000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function getActor(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, role: "guest" as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  const role =
    profile?.role === "customer" ||
    profile?.role === "contractor" ||
    profile?.role === "admin"
      ? profile.role
      : "guest";

  return { user, role };
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createServerClient();
    const actor = await getActor(supabase);

    if (!actor.user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: feedback, error: feedbackError } = await supabase
      .from("feedback_items")
      .select("id, user_id, status, subject")
      .eq("id", id)
      .maybeSingle();

    if (feedbackError) {
      return NextResponse.json(
        { error: feedbackError.message || "Unable to load feedback." },
        { status: 500 }
      );
    }

    if (!feedback) {
      return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
    }
    
    if (feedback.status === "closed") {
  return NextResponse.json(
    { error: "This thread is closed." },
    { status: 400 }
  );
}
    if (actor.role !== "admin" && feedback.user_id !== actor.user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    let query = supabase
      .from("feedback_messages")
      .select("id, feedback_id, created_at, sender_user_id, sender_role, body, is_internal")
      .eq("feedback_id", id)
      .order("created_at", { ascending: true });

    if (actor.role !== "admin") {
      query = query.eq("is_internal", false);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      return NextResponse.json(
        { error: messagesError.message || "Unable to load messages." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      feedback,
      messages: messages ?? [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to load messages." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createServerClient();
    const actor = await getActor(supabase);

    if (!actor.user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const message = asTrimmedString(body.message, 5000);

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const { data: feedback, error: feedbackError } = await supabase
      .from("feedback_items")
      .select("id, user_id, status")
      .eq("id", id)
      .maybeSingle();

    if (feedbackError) {
      return NextResponse.json(
        { error: feedbackError.message || "Unable to load feedback." },
        { status: 500 }
      );
    }

        if (!feedback) {
      return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
    }

    if (actor.role !== "admin" && feedback.user_id !== actor.user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (feedback.status === "closed") {
      return NextResponse.json(
        { error: "This feedback thread is closed." },
        { status: 400 }
      );
    }

    const { data: inserted, error: insertError } = await supabase
      .from("feedback_messages")
      .insert({
        feedback_id: id,
        sender_user_id: actor.user.id,
        sender_role: actor.role === "admin" ? "admin" : actor.role,
        body: message,
        is_internal: false,
      })
      .select("id, feedback_id, created_at, sender_user_id, sender_role, body, is_internal")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message || "Unable to send message." },
        { status: 500 }
      );
    }

    if (actor.role !== "admin") {
      await supabase
        .from("feedback_items")
        .update({
          status: "in_review",
        })
        .eq("id", id);
    }

    return NextResponse.json({
      ok: true,
      message: inserted,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to send message." },
      { status: 500 }
    );
  }
}