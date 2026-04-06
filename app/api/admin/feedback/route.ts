import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase/server";

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

export async function GET(req: NextRequest) {
  try {
    const { supabase, isAdmin } = await requireAdmin();

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);

    const role = asTrimmedString(searchParams.get("role"));
    const status = asTrimmedString(searchParams.get("status"));
    const source = asTrimmedString(searchParams.get("source"));
    const priority = asTrimmedString(searchParams.get("priority"));
    const search = asTrimmedString(searchParams.get("search"), 120);

    let query = supabase
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
      .order("last_message_at", { ascending: false });

    if (role) query = query.eq("role", role);
    if (status) query = query.eq("status", status);
    if (source) query = query.eq("source", source);
    if (priority) query = query.eq("priority", priority);

    if (search) {
      query = query.or(
        `subject.ilike.%${search}%,message.ilike.%${search}%,guest_email.ilike.%${search}%,guest_name.ilike.%${search}%`
      );
    }

    const { data: items, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message || "Unable to load feedback." },
        { status: 500 }
      );
    }

    const rows = items ?? [];

    const customerIds = Array.from(
      new Set(rows.map((x) => x.customer_id).filter(Boolean))
    ) as string[];

    const contractorIds = Array.from(
      new Set(rows.map((x) => x.contractor_company_id).filter(Boolean))
    ) as string[];

    const feedbackIds = rows.map((x) => x.id);

    const customerMap = new Map<string, string>();
    const contractorMap = new Map<string, string>();
    const lastVisibleMessageMap = new Map<
      string,
      { sender_role: string; created_at: string }
    >();

    if (customerIds.length > 0) {
      const { data: customers } = await supabase
        .from("customers")
        .select("id, company_name")
        .in("id", customerIds);

      (customers ?? []).forEach((row: any) => {
        customerMap.set(row.id, row.company_name || "Customer");
      });
    }

    if (contractorIds.length > 0) {
      const { data: contractors } = await supabase
        .from("contractor_companies")
        .select("id, legal_name, dba_name")
        .in("id", contractorIds);

      (contractors ?? []).forEach((row: any) => {
        contractorMap.set(
          row.id,
          row.dba_name || row.legal_name || "Contractor"
        );
      });
    }

    if (feedbackIds.length > 0) {
      const { data: allMessages } = await supabase
        .from("feedback_messages")
        .select("feedback_id, sender_role, created_at, is_internal")
        .in("feedback_id", feedbackIds)
        .eq("is_internal", false)
        .order("created_at", { ascending: false });

      for (const msg of allMessages ?? []) {
        if (!lastVisibleMessageMap.has(msg.feedback_id)) {
          lastVisibleMessageMap.set(msg.feedback_id, {
            sender_role: msg.sender_role,
            created_at: msg.created_at,
          });
        }
      }
    }

    const normalized = rows.map((row: any) => {
      let actor_name = "Unknown";
      let actor_type = row.role || "public";

      if (row.role === "customer" && row.customer_id) {
        actor_name = customerMap.get(row.customer_id) || "Customer";
        actor_type = "customer";
      } else if (row.role === "contractor" && row.contractor_company_id) {
        actor_name = contractorMap.get(row.contractor_company_id) || "Contractor";
        actor_type = "contractor";
      } else if (row.guest_name) {
        actor_name = row.guest_name;
        actor_type = "guest";
      } else if (row.guest_email) {
        actor_name = row.guest_email;
        actor_type = "guest";
      }

      const lastVisible = lastVisibleMessageMap.get(row.id) || null;

      const hasUnreadUserSideMessage =
        row.status !== "closed" &&
        !!lastVisible &&
        lastVisible.sender_role !== "admin" &&
        (!row.reviewed_at ||
          new Date(lastVisible.created_at).getTime() >
            new Date(row.reviewed_at).getTime());

      const needs_admin_attention =
        row.status !== "closed" &&
        (row.status === "new" || hasUnreadUserSideMessage);

      return {
        ...row,
        actor_name,
        actor_type,
        needs_admin_attention,
        last_sender_role: lastVisible?.sender_role ?? null,
        last_visible_message_at: lastVisible?.created_at ?? null,
      };
    });

    const summary = {
      total: normalized.length,
      newCount: normalized.filter((x) => x.status === "new").length,
      inReviewCount: normalized.filter((x) => x.status === "in_review").length,
      waitingForUserCount: normalized.filter((x) => x.status === "waiting_for_user").length,
      resolvedCount: normalized.filter((x) => x.status === "resolved").length,
      customerCount: normalized.filter((x) => x.actor_type === "customer").length,
      contractorCount: normalized.filter((x) => x.actor_type === "contractor").length,
      publicCount: normalized.filter((x) => x.actor_type === "guest").length,
      highPriorityCount: normalized.filter((x) => x.priority === "high").length,
      attentionCount: normalized.filter((x) => x.needs_admin_attention).length,
    };

    return NextResponse.json({
      items: normalized,
      summary,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to load feedback." },
      { status: 500 }
    );
  }
}