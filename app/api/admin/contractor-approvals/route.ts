import { NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase/server";
import { unwrapSupabase } from "../../../../lib/errors/unwrapSupabase";
import { withServerErrorLogging } from "../../../../lib/errors/withServerErrorLogging";

type ProfileRow = {
  id: string;
  role: string | null;
};

type ContractorApprovalRow = {
  id: string;
  legal_name: string | null;
  dba_name: string | null;
  status: string | null;
  onboarding_status: string | null;
  created_at: string;
  owner_user_id: string | null;
  block_reason: string | null;
  public_profile:
    | {
        company_id: string;
        is_listed: boolean | null;
        headline: string | null;
        home_market: string | null;
        markets: string[] | null;
      }
    | {
        company_id: string;
        is_listed: boolean | null;
        headline: string | null;
        home_market: string | null;
        markets: string[] | null;
      }[]
    | null;
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

        const profileResult = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", user.id)
          .maybeSingle();

        const profile = unwrapSupabase(
          profileResult,
          "admin_contractor_approvals_profile_load_failed",
          "Unable to load profile."
        ) as ProfileRow | null;

        if (!profile || profile.role !== "admin") {
          return NextResponse.json({ error: "Forbidden." }, { status: 403 });
        }

        const companiesResult = await supabase
          .from("contractor_companies")
          .select(
            `
            id,
            legal_name,
            dba_name,
            status,
            onboarding_status,
            created_at,
            owner_user_id,
            block_reason,
            public_profile:contractor_public_profiles (
              company_id,
              is_listed,
              headline,
              home_market,
              markets
            )
            `
          )
          .eq("onboarding_status", "submitted")
          .order("created_at", { ascending: false });

        const rows = unwrapSupabase(
          companiesResult,
          "admin_contractor_approvals_load_failed",
          "Unable to load contractor approvals."
        ) as ContractorApprovalRow[];

        return NextResponse.json({
          rows: rows || [],
        });
      },
      {
        message: "admin_contractor_approvals_route_failed",
        code: "admin_contractor_approvals_route_failed",
        source: "api",
        area: "admin",
        path: "/api/admin/contractor-approvals",
        role: "admin",
      }
    );

    return result;
  } catch {
    return NextResponse.json(
      { error: "Unable to load contractor approvals." },
      { status: 500 }
    );
  }
}