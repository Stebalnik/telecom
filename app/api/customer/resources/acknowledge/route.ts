import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseForAuth(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
    }

    const { resourceId }: { resourceId?: string } = await req.json();

    if (!resourceId) {
      return NextResponse.json({ error: "resourceId is required." }, { status: 400 });
    }

    const supabase = getSupabaseForAuth(token);

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);

    if (userErr || !userData.user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", userData.user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    if (profile.role !== "contractor") {
      return NextResponse.json({ error: "Only contractors can acknowledge resources." }, { status: 403 });
    }

    const { data, error } = await supabase.rpc("acknowledge_customer_resource", {
      p_resource_id: resourceId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data ?? { ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected acknowledge error." },
      { status: 500 }
    );
  }
}