import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../../lib/supabase/server";
import { unwrapSupabase } from "../../../../../../lib/errors/unwrapSupabase";
import { withServerErrorLogging } from "../../../../../../lib/errors/withServerErrorLogging";

type ProfileRow = {
  id: string;
  role: string | null;
};

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
          "admin_customer_return_to_draft_profile_load_failed"
        );

        if (!profile || profile.role !== "admin") {
          return NextResponse.json({ error: "Forbidden." }, { status: 403 });
        }

        unwrapSupabase(
          await supabase
            .from("customers")
            .update({
              onboarding_status: "draft",
              status: "pending_review",
              reviewed_at: new Date().toISOString(),
              reviewed_by: user.id,
            })
            .eq("id", id),
          "admin_customer_return_to_draft_update_failed"
        );

        return NextResponse.json({ ok: true });
      },
      {
        message: "admin_customer_return_to_draft_route_failed",
        code: "admin_customer_return_to_draft_route_failed",
        source: "api",
        area: "admin",
        path: `/api/admin/customer-approvals/${id}/return-to-draft`,
        role: "admin",
      }
    );

    return result;
  } catch {
    return NextResponse.json(
      { error: "Unable to return customer to draft." },
      { status: 500 }
    );
  }
}