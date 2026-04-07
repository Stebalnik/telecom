import { NextResponse } from "next/server";
import { unwrapSupabase } from "../../../../lib/errors/unwrapSupabase";
import { withServerErrorLogging } from "../../../../lib/errors/withServerErrorLogging";
import { createClient } from "../../../../lib/supabase/server";

export async function POST(req: Request) {
  try {
    const result = await withServerErrorLogging(
      async () => {
        const body = await req.json();
        const customerId = String(body?.customerId || "").trim();
        const contractorCompanyId = String(body?.contractorCompanyId || "").trim();

        if (!customerId) {
          return NextResponse.json(
            { error: "customerId is required" },
            { status: 400 }
          );
        }

        if (!contractorCompanyId) {
          return NextResponse.json(
            { error: "contractorCompanyId is required" },
            { status: 400 }
          );
        }

        const supabase = await createClient();

        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr) {
          return NextResponse.json(
            { error: "Unable to verify user." },
            { status: 401 }
          );
        }

        if (!user) {
          return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 }
          );
        }

        const data = unwrapSupabase(
          await supabase.rpc("request_customer_approval", {
            p_customer_id: customerId,
            p_contractor_company_id: contractorCompanyId,
          }),
          "request_customer_approval_failed",
          "Unable to request customer approval."
        );

        return NextResponse.json(
          data ?? { ok: false, error: "Unable to request customer approval." }
        );
      },
      {
        message: "customer_approval_request_failed",
        code: "customer_approval_request_failed",
        source: "api",
        area: "customer",
        path: "/api/customer-approvals/request",
      }
    );

    return result;
  } catch {
    return NextResponse.json(
      { error: "Unable to request customer approval." },
      { status: 500 }
    );
  }
}