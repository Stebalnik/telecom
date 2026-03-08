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

// POST body: { companyId?: string, filename: string, contentType?: string }
export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ error: "Missing Authorization Bearer token" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const companyId = String(body.companyId || "");
    const filename = String(body.filename || "");
    const contentType = String(body.contentType || "application/pdf");

    if (!companyId) return NextResponse.json({ error: "Missing companyId" }, { status: 400 });
    if (!filename) return NextResponse.json({ error: "Missing filename" }, { status: 400 });

    // 1) validate user token
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    const userId = userData.user.id;

    // 2) must be contractor + own this company
    const { data: prof, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });
    if (prof?.role !== "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: cc, error: ccErr } = await supabaseAdmin
      .from("contractor_companies")
      .select("id")
      .eq("id", companyId)
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (ccErr) return NextResponse.json({ error: ccErr.message }, { status: 500 });
    if (!cc?.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 3) create signed upload url for PRIVATE bucket
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `coi/${companyId}/${Date.now()}_${safeName}`;

    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("coi-files")
      // NOTE: storage-js supports createSignedUploadUrl(path)
      .createSignedUploadUrl(path);

    if (signErr) return NextResponse.json({ error: signErr.message }, { status: 500 });

    // signed: { signedUrl, path, token }
    return NextResponse.json({
      path: signed.path,
      token: signed.token,
      signedUrl: signed.signedUrl, // for debugging (not required on client)
      contentType,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}