import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../../lib/supabase/server";

function asTrimmedString(value: unknown, max = 5000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function requireAdmin() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, isAdmin: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    isAdmin: profile?.role === "admin",
  };
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { supabase, user, isAdmin } = await requireAdmin();

    if (!isAdmin || !user) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const message = asTrimmedString(body.message, 5000);
    const isInternal = body.is_internal === true;
    const nextStatus = asTrimmedString(body.status, 50);

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const { data: feedback, error: feedbackError } = await supabase
      .from("feedback_items")
      .select("id, status")
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

    const { data: inserted, error: insertError } = await supabase
      .from("feedback_messages")
      .insert({
        feedback_id: id,
        sender_user_id: user.id,
        sender_role: "admin",
        body: message,
        is_internal: isInternal,
      })
      .select("id, feedback_id, created_at, sender_user_id, sender_role, body, is_internal")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message || "Unable to send admin reply." },
        { status: 500 }
      );
    }

    const statusToApply =
      nextStatus ||
      (isInternal ? feedback.status : "waiting_for_user");

    await supabase
      .from("feedback_items")
      .update({
        status: statusToApply,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({
      ok: true,
      message: inserted,
      status: statusToApply,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to send admin reply." },
      { status: 500 }
    );
  }
}