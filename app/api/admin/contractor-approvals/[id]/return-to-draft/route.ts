import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../../lib/supabase/server";
import { unwrapSupabase } from "../../../../../../lib/errors/unwrapSupabase";
import { normalizeError } from "../../../../../../lib/errors/normalizeError";
import { withServerErrorLogging } from "../../../../../../lib/errors/withServerErrorLogging";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ProfileRow = {
  id: string;
  role: string | null;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const companyId = String(id || "").trim();

  if (!companyId) {
    return NextResponse.json(
      { error: "Invalid contractor company id." },
      { status: 400 }
    );
  }

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
          "admin_contractor_return_to_draft_profile_load_failed",
          "Unable to load profile."
        ) as ProfileRow | null;

        if (!profile || profile.role !== "admin") {
          return NextResponse.json({ error: "Forbidden." }, { status: 403 });
        }

        const companyUpdateResult = await supabase
          .from("contractor_companies")
          .update({
            onboarding_status: "draft",
          })
          .eq("id", companyId)
          .eq("onboarding_status", "submitted")
          .select("id")
          .maybeSingle();

        if (companyUpdateResult.error) {
          throw normalizeError(
            companyUpdateResult.error,
            "admin_contractor_return_to_draft_update_failed",
            "Unable to return contractor to draft."
          );
        }

        if (!companyUpdateResult.data) {
          return NextResponse.json(
            { error: "Contractor submission not found or already updated." },
            { status: 404 }
          );
        }

        return NextResponse.json({ ok: true });
      },
      {
        message: "admin_contractor_return_to_draft_route_failed",
        code: "admin_contractor_return_to_draft_route_failed",
        source: "api",
        area: "admin",
        path: `/api/admin/contractor-approvals/${companyId}/return-to-draft`,
        role: "admin",
        details: {
          companyId,
        },
      }
    );

    return result;
  } catch {
    return NextResponse.json(
      { error: "Unable to return contractor to draft." },
      { status: 500 }
    );
  }
}