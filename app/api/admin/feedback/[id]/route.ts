import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase/server";

const ALLOWED_STATUSES = new Set([
  "new",
  "in_review",
  "waiting_for_user",
  "planned",
  "resolved",
  "closed",
]);

function asTrimmedString(value: unknown, max = 500) {
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

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { supabase, isAdmin } = await requireAdmin();

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { data: item, error } = await supabase
      .from("feedback_items")
      .select(`
        id,
        created_at,
        updated_at,
        user_id,
        role,
        source,
        customer_id,
        contractor_company_id,
        guest_name,
        guest_email,
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

    if (!item) {
      return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
    }

    let actor_name = "Unknown";
    let actor_type = item.role || "public";

    if (item.role === "customer" && item.customer_id) {
      const { data: customer } = await supabase
        .from("customers")
        .select("id, company_name")
        .eq("id", item.customer_id)
        .maybeSingle();

      actor_name = customer?.company_name || "Customer";
    } else if (item.role === "contractor" && item.contractor_company_id) {
      const { data: contractor } = await supabase
        .from("contractor_companies")
        .select("id, legal_name, dba_name")
        .eq("id", item.contractor_company_id)
        .maybeSingle();

      actor_name = contractor?.dba_name || contractor?.legal_name || "Contractor";
    } else if (item.guest_name) {
      actor_name = item.guest_name;
      actor_type = "guest";
    } else if (item.guest_email) {
      actor_name = item.guest_email;
      actor_type = "guest";
    }

    return NextResponse.json({
      item: {
        ...item,
        actor_name,
        actor_type,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to load feedback." },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const status = asTrimmedString(body.status, 50);

    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("feedback_items")
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, status, reviewed_by, reviewed_at, updated_at, last_message_at")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Unable to update feedback." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      item: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to update feedback." },
      { status: 500 }
    );
  }
}