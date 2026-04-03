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

function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 180);
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

    const supabase = getSupabaseForAuth(token);

    const {
      fileName,
      contentType,
    }: {
      fileName?: string;
      contentType?: string;
    } = await req.json();

    if (!fileName || !fileName.trim()) {
      return NextResponse.json({ error: "fileName is required." }, { status: 400 });
    }

    const {
      data: userData,
      error: userErr,
    } = await supabase.auth.getUser(token);

    if (userErr || !userData.user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const userId = userData.user.id;

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    if (profile.role !== "customer") {
      return NextResponse.json({ error: "Only customers can upload resources." }, { status: 403 });
    }

    const { data: customer, error: customerErr } = await supabase
      .from("customers")
      .select("id")
      .eq("owner_user_id", userId)
      .single();

    if (customerErr || !customer) {
      return NextResponse.json({ error: "Customer organization not found." }, { status: 404 });
    }

    const resourceId = crypto.randomUUID();
    const safeName = sanitizeFileName(fileName) || "resource-file";
    const path = `${customer.id}/${resourceId}/${safeName}`;

    const { data, error } = await supabase.storage
      .from("customer-resources")
      .createSignedUploadUrl(path, {
        upsert: false,
      });

    if (error || !data?.signedUrl || !data?.token) {
      return NextResponse.json(
        { error: error?.message || "Failed to create signed upload URL." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      resourceId,
      customerId: customer.id,
      path,
      signedUrl: data.signedUrl,
      token: data.token,
      contentType: contentType || null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected upload URL error." },
      { status: 500 }
    );
  }
}