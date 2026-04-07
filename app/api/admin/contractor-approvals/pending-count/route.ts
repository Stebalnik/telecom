import { NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase/server";

type ProfileRow = {
  id: string;
  role: string | null;
};

export async function GET() {
  try {
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

    if (profileResult.error) {
      return NextResponse.json(
        { error: "Unable to load profile." },
        { status: 500 }
      );
    }

    const profile = profileResult.data as ProfileRow | null;

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const pendingCountResult = await supabase
      .from("contractor_companies")
      .select("id", { count: "exact", head: true })
      .eq("onboarding_status", "submitted");

    if (pendingCountResult.error) {
      return NextResponse.json(
        { error: "Unable to load contractor approval count." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      count: pendingCountResult.count ?? 0,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load contractor approval count." },
      { status: 500 }
    );
  }
}