import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabase/server";

type FeedbackCategory =
  | "bug"
  | "feature_request"
  | "ux_issue"
  | "billing"
  | "account"
  | "other";

type FeedbackPriority = "low" | "normal" | "high";
type FeedbackSource =
  | "public"
  | "landing"
  | "signup"
  | "login"
  | "dashboard"
  | "customer"
  | "contractor"
  | "admin";

const ALLOWED_CATEGORIES = new Set<FeedbackCategory>([
  "bug",
  "feature_request",
  "ux_issue",
  "billing",
  "account",
  "other",
]);

const ALLOWED_PRIORITIES = new Set<FeedbackPriority>([
  "low",
  "normal",
  "high",
]);

const ALLOWED_SOURCES = new Set<FeedbackSource>([
  "public",
  "landing",
  "signup",
  "login",
  "dashboard",
  "customer",
  "contractor",
  "admin",
]);

function asTrimmedString(value: unknown, max = 5000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function getActorContext(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      role: "unknown" as const,
      customerId: null as string | null,
      contractorCompanyId: null as string | null,
    };
  }

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
      : "unknown";

  let customerId: string | null = null;
  let contractorCompanyId: string | null = null;

  if (role === "customer") {
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("owner_user_id", user.id)
      .maybeSingle();

    customerId = customer?.id ?? null;
  }

  if (role === "contractor") {
    const { data: company } = await supabase
      .from("contractor_companies")
      .select("id")
      .eq("owner_user_id", user.id)
      .maybeSingle();

    contractorCompanyId = company?.id ?? null;
  }

  return {
    user,
    role,
    customerId,
    contractorCompanyId,
  };
}

export async function GET() {
  try {
    const supabase = await createServerClient();

    const actor = await getActorContext(supabase);

    if (!actor.user) {
      return NextResponse.json({ items: [] });
    }

    const { data, error } = await supabase
      .from("feedback_items")
      .select(
        `
        id,
        created_at,
        updated_at,
        role,
        source,
        category,
        subject,
        message,
        priority,
        status,
        path,
        last_message_at,
        reviewed_at
      `
      )
      .eq("user_id", actor.user.id)
      .order("last_message_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Unable to load feedback." },
        { status: 500 }
      );
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to load feedback." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const body = await req.json().catch(() => ({}));

    const category = asTrimmedString(body.category, 100) as FeedbackCategory;
    const subject = asTrimmedString(body.subject, 200);
    const message = asTrimmedString(body.message, 5000);
    const priority = asTrimmedString(body.priority, 20) as FeedbackPriority;
    const source = asTrimmedString(body.source, 50) as FeedbackSource;
    const path = asTrimmedString(body.path, 500) || null;
    const guestName = asTrimmedString(body.guest_name, 120) || null;
    const guestEmail = asTrimmedString(body.guest_email, 190) || null;

    if (!ALLOWED_CATEGORIES.has(category)) {
      return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    }

    if (!subject) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    if (!ALLOWED_PRIORITIES.has(priority)) {
      return NextResponse.json({ error: "Invalid priority." }, { status: 400 });
    }

    if (!ALLOWED_SOURCES.has(source)) {
      return NextResponse.json({ error: "Invalid source." }, { status: 400 });
    }

    const actor = await getActorContext(supabase);

    const itemInsert = {
      user_id: actor.user?.id ?? null,
      role: actor.role,
      source,
      customer_id: actor.customerId,
      contractor_company_id: actor.contractorCompanyId,
      guest_name: actor.user ? null : guestName,
      guest_email: actor.user ? null : guestEmail,
      category,
      subject,
      message,
      priority,
      status: "new",
      path,
    };

    const { data: insertedItem, error: itemError } = await supabase
      .from("feedback_items")
      .insert(itemInsert)
      .select("id, status, created_at, last_message_at")
      .single();

    if (itemError) {
      return NextResponse.json(
        { error: itemError.message || "Unable to create feedback." },
        { status: 500 }
      );
    }

    const senderRole = actor.user
      ? actor.role === "customer" || actor.role === "contractor" || actor.role === "admin"
        ? actor.role
        : "guest"
      : "guest";

    const { error: messageError } = await supabase.from("feedback_messages").insert({
      feedback_id: insertedItem.id,
      sender_user_id: actor.user?.id ?? null,
      sender_role: senderRole,
      body: message,
      is_internal: false,
    });

    if (messageError) {
      return NextResponse.json(
        { error: messageError.message || "Feedback created, but message failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      item: insertedItem,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to create feedback." },
      { status: 500 }
    );
  }
}