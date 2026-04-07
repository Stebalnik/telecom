import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { unwrapSupabase } from "@/lib/errors/unwrapSupabase";
import { withServerErrorLogging } from "@/lib/errors/withServerErrorLogging";

type ProfileRow = {
  id: string;
  role: string | null;
};

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
    const result = await withServerErrorLogging(
      async () => {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.startsWith("Bearer ")
          ? authHeader.slice("Bearer ".length)
          : null;

        if (!token) {
          return NextResponse.json(
            { error: "Missing bearer token." },
            { status: 401 }
          );
        }

        const { resourceId }: { resourceId?: string } = await req.json();

        if (!resourceId) {
          return NextResponse.json(
            { error: "resourceId is required." },
            { status: 400 }
          );
        }

        const supabase = getSupabaseForAuth(token);

        const {
          data: userData,
          error: userErr,
        } = await supabase.auth.getUser(token);

        if (userErr || !userData.user) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const profile = unwrapSupabase<ProfileRow>(
          await supabase
            .from("profiles")
            .select("id, role")
            .eq("id", userData.user.id)
            .single(),
          "acknowledge_customer_resource_profile_failed",
          "Unable to load profile."
        );

        if (!profile) {
          return NextResponse.json(
            { error: "Profile not found." },
            { status: 404 }
          );
        }

        if (profile.role !== "contractor") {
          return NextResponse.json(
            { error: "Only contractors can acknowledge resources." },
            { status: 403 }
          );
        }

        const data = unwrapSupabase(
          await supabase.rpc("acknowledge_customer_resource", {
            p_resource_id: resourceId,
          }),
          "acknowledge_customer_resource_failed",
          "Unable to acknowledge resource."
        );

        return NextResponse.json(data ?? { ok: true });
      },
      {
        message: "acknowledge_customer_resource_route_failed",
        code: "acknowledge_customer_resource_route_failed",
        source: "api",
        area: "customer",
        path: "/api/customer/resources/acknowledge",
      }
    );

    return result;
  } catch {
    return NextResponse.json(
      { error: "Unable to acknowledge resource." },
      { status: 500 }
    );
  }
}