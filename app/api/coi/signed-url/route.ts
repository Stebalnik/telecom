import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const coiId = searchParams.get("coiId");
  if (!coiId) return NextResponse.json({ error: "Missing coiId" }, { status: 400 });

  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ error: "Missing Authorization Bearer token" }, { status: 401 });

  // 1) validate user token
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  const userId = userData.user.id;

  // 2) role
  const { data: prof, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });
  const role = prof?.role ?? "unknown";

  // 3) load COI row
  const { data: coi, error: coiErr } = await supabaseAdmin
    .from("contractor_coi")
    .select("id, company_id, file_path")
    .eq("id", coiId)
    .single();

  if (coiErr) return NextResponse.json({ error: coiErr.message }, { status: 404 });

  // 4) authorize
  let allowed = false;

  if (role === "admin") {
    allowed = true;
  } else if (role === "contractor") {
    // contractor can view ONLY own company COI
    const { data: cc, error: ccErr } = await supabaseAdmin
      .from("contractor_companies")
      .select("id")
      .eq("id", coi.company_id)
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (ccErr) return NextResponse.json({ error: ccErr.message }, { status: 500 });
    if (cc?.id) allowed = true;
  } else if (role === "customer") {
    // customer can view COI of approved contractors in their list
    const { data: cust, error: custErr } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (custErr) return NextResponse.json({ error: custErr.message }, { status: 500 });

    if (cust?.id) {
      const { data: link, error: linkErr } = await supabaseAdmin
        .from("customer_contractors")
        .select("id")
        .eq("customer_id", cust.id)
        .eq("contractor_company_id", coi.company_id)
        .eq("status", "approved")
        .maybeSingle();

      if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });
      if (link?.id) allowed = true;
    }
  }

  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // 5) signed URL
  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from("coi-files")
    .createSignedUrl(coi.file_path, 60 * 10); // 10 minutes

  if (signErr) return NextResponse.json({ error: signErr.message }, { status: 500 });

  return NextResponse.json({ url: signed.signedUrl });
}
