import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase/server";

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

    const { data, error } = await supabase
      .from("feedback_items")
      .select(`
        id,
        created_at,
        updated_at,
        user_id,
        role,
        source,
        category,
        subject,
        message,
        priority,
        status,
        path,
        last_message_at,
        reviewed_by,
        reviewed_at
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Unable to load feedback." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
    }

    if (actor.role !== "admin" && data.user_id !== actor.user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    return NextResponse.json({ item: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to load feedback." },
      { status: 500 }
    );
  }
}