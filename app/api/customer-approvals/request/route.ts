import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const customerId = String(body?.customerId || "").trim();
    const contractorCompanyId = String(body?.contractorCompanyId || "").trim();

    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
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
      return NextResponse.json({ error: userErr.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("request_customer_approval", {
      p_customer_id: customerId,
      p_contractor_company_id: contractorCompanyId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data ?? { ok: false, error: "Unknown error" });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}