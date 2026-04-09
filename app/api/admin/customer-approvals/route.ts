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
  name: string | null;
  company_name: string | null;
  legal_name: string | null;
  dba_name: string | null;
  description: string | null;
  fein: string | null;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  project_contact_name: string | null;
  project_contact_title: string | null;
  project_contact_email: string | null;
  project_contact_phone: string | null;
  activation_notification_phone: string | null;
  status: string | null;
  onboarding_status: string | null;
  created_at: string;
  owner_user_id: string | null;
  review_notes: string | null;
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

        if (profile.role !== "admin") {
          return NextResponse.json({ error: "Forbidden." }, { status: 403 });
        }

        const rows = unwrapSupabase<CustomerApprovalRow[]>(
          await supabase
            .from("customers")
            .select(`
              id,
              name,
              company_name,
              legal_name,
              dba_name,
              description,
              fein,
              phone,
              email,
              address_line1,
              address_line2,
              city,
              state,
              zip,
              country,
              project_contact_name,
              project_contact_title,
              project_contact_email,
              project_contact_phone,
              activation_notification_phone,
              status,
              onboarding_status,
              created_at,
              owner_user_id,
              review_notes
            `)
            .eq("onboarding_status", "submitted")
            .order("created_at", { ascending: false }),
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