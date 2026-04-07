import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ErrorLogLevel = "info" | "warning" | "error" | "critical";
type ErrorLogSource = "frontend" | "api" | "db" | "auth" | "server" | "admin";

function parseBooleanParam(value: string | null): boolean | null {
  if (value === null || value === "") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function parseCsv(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile || profile.role !== "admin") {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true as const,
    supabase,
    user,
  };
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const { supabase } = admin;

    const url = req.nextUrl;
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") || "50"), 1),
      500
    );
    const offset = Math.max(Number(url.searchParams.get("offset") || "0"), 0);

    const levelList = parseCsv(url.searchParams.get("level"));
    const sourceList = parseCsv(url.searchParams.get("source"));
    const areaList = parseCsv(url.searchParams.get("area"));
    const codeList = parseCsv(url.searchParams.get("code"));
    const resolved = parseBooleanParam(url.searchParams.get("resolved"));
    const search = (url.searchParams.get("search") || "").trim();
    const fingerprint = (url.searchParams.get("fingerprint") || "").trim();
    const summaryOnly = url.searchParams.get("summary") === "true";

    let baseQuery = supabase.from("error_logs").select("*", { count: "exact" });

    if (levelList.length > 0) {
      baseQuery = baseQuery.in("level", levelList);
    }

    if (sourceList.length > 0) {
      baseQuery = baseQuery.in("source", sourceList);
    }

    if (areaList.length > 0) {
      baseQuery = baseQuery.in("area", areaList);
    }

    if (codeList.length > 0) {
      baseQuery = baseQuery.in("code", codeList);
    }

    if (resolved === true) {
      baseQuery = baseQuery.not("resolved_at", "is", null);
    } else if (resolved === false) {
      baseQuery = baseQuery.is("resolved_at", null);
    }

    if (fingerprint) {
      baseQuery = baseQuery.eq("fingerprint", fingerprint);
    }

    if (search) {
      const escaped = search.replace(/[%_]/g, "");
      baseQuery = baseQuery.or(
        [
          `message.ilike.%${escaped}%`,
          `path.ilike.%${escaped}%`,
          `area.ilike.%${escaped}%`,
          `source.ilike.%${escaped}%`,
          `code.ilike.%${escaped}%`,
          `fingerprint.ilike.%${escaped}%`,
        ].join(",")
      );
    }

    if (summaryOnly) {
      const { data: rows, error, count } = await baseQuery.order("created_at", {
        ascending: false,
      });

      if (error) {
        throw new Error(error.message);
      }

      const safeRows = rows ?? [];

      const unresolvedCount = safeRows.filter((row) => !row.resolved_at).length;
      const criticalCount = safeRows.filter(
        (row) => row.level === "critical"
      ).length;

      const byLevel = safeRows.reduce<Record<string, number>>((acc, row) => {
        const key = row.level || "unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      const bySource = safeRows.reduce<Record<string, number>>((acc, row) => {
        const key = row.source || "unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      const byArea = safeRows.reduce<Record<string, number>>((acc, row) => {
        const key = row.area || "unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      const topFingerprints = Object.entries(
        safeRows.reduce<Record<string, number>>((acc, row) => {
          const key = row.fingerprint || "no_fingerprint";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {})
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([fingerprintValue, total]) => ({
          fingerprint: fingerprintValue,
          total,
        }));

      return NextResponse.json({
        ok: true,
        summary: {
          total: count ?? safeRows.length,
          unresolvedCount,
          criticalCount,
          byLevel,
          bySource,
          byArea,
          topFingerprints,
        },
      });
    }

    const { data, error, count } = await baseQuery
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []).map((row) => ({
      ...row,
      is_resolved: !!row.resolved_at,
    }));

    return NextResponse.json({
      ok: true,
      rows,
      pagination: {
        limit,
        offset,
        total: count ?? 0,
      },
      filters: {
        level: levelList,
        source: sourceList,
        area: areaList,
        code: codeList,
        resolved,
        search,
        fingerprint,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error loading logs" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const { supabase, user } = admin;

    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    const resolved = body?.resolved;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    if (typeof resolved !== "boolean") {
      return NextResponse.json(
        { error: "resolved must be boolean" },
        { status: 400 }
      );
    }

    const payload = resolved
      ? {
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        }
      : {
          resolved_at: null,
          resolved_by: null,
        };

    const { data, error } = await supabase
      .from("error_logs")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
      row: {
        ...data,
        is_resolved: !!data?.resolved_at,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error updating log" },
      { status: 500 }
    );
  }
}