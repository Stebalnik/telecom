import { NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase/server";
import { unwrapSupabase } from "../../../../lib/errors/unwrapSupabase";
import { withServerErrorLogging } from "../../../../lib/errors/withServerErrorLogging";

type ProfileRow = {
  id: string;
  role: string | null;
};

type CustomerApprovalRow = {
  id: string;
  company_name: string | null;
  status: string | null;
  onboarding_status: string | null;
  created_at: string;
  owner_user_id: string | null;
};

export async function GET() {
  try {
    const result = await withServerErrorLogging(
      async () => {
        const supabase = await createServerClient();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const profile = unwrapSupabase<ProfileRow>(
          await supabase
            .from("profiles")
            .select("id, role")
            .eq("id", user.id)
            .single(),
          "admin_customer_approvals_profile_load_failed"
        );

        if (!profile || profile.role !== "admin") {
          return NextResponse.json({ error: "Forbidden." }, { status: 403 });
        }

        const approvalsResult = await supabase
          .from("customers")
          .select(`
            id,
            company_name,
            status,
            onboarding_status,
            created_at,
            owner_user_id
          `)
          .eq("onboarding_status", "submitted")
          .order("created_at", { ascending: false });

        const rows = unwrapSupabase<CustomerApprovalRow[]>(
          approvalsResult,
          "admin_customer_approvals_load_failed"
        );

        return NextResponse.json({
          rows: rows ?? [],
        });
      },
      {
        message: "admin_customer_approvals_route_failed",
        code: "admin_customer_approvals_route_failed",
        source: "api",
        area: "admin",
        path: "/api/admin/customer-approvals",
        role: "admin",
      }
    );

    return result;
  } catch {
    return NextResponse.json(
      { error: "Unable to load customer approvals." },
      { status: 500 }
    );
  }
}