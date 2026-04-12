import { NextResponse } from "next/server";
import { normalizeError } from "../../../../../lib/errors/normalizeError";
import { withServerErrorLogging } from "../../../../../lib/errors/withServerErrorLogging";
import { createClient } from "../../../../../lib/supabase/server";

type AppRouteError = Error & {
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
};

type ContractorCompanyRow = {
  id: string;
  owner_id: string | null;
};

type WorkerProfileRow = {
  user_id: string;
  full_name: string | null;
  headline: string | null;
  summary: string | null;
  primary_role: string | null;
  secondary_roles: string[] | null;
  years_experience: number | null;
  home_market: string | null;
  markets: string[] | null;
  travel_willingness: string | null;
  employment_type_preference: string[] | null;
  availability_mode: string | null;
  phone: string | null;
  is_active: boolean | null;
};

function createRouteError(
  message: string,
  code: string,
  statusCode: number,
  details?: Record<string, unknown>
): AppRouteError {
  const error = new Error(message) as AppRouteError;
  error.code = code;
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toNullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function toNullableStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const items = value.filter((item): item is string => typeof item === "string");
  return items;
}

function toCompanyRows(value: unknown): ContractorCompanyRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((row): ContractorCompanyRow | null => {
      const id = typeof row.id === "string" ? row.id : null;

      if (!id) {
        return null;
      }

      return {
        id,
        owner_id: toNullableString(row.owner_id),
      };
    })
    .filter((row): row is ContractorCompanyRow => row !== null);
}

function toWorkerProfileRows(value: unknown): WorkerProfileRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((row): WorkerProfileRow | null => {
      const userId = typeof row.user_id === "string" ? row.user_id : null;

      if (!userId) {
        return null;
      }

      return {
        user_id: userId,
        full_name: toNullableString(row.full_name),
        headline: toNullableString(row.headline),
        summary: toNullableString(row.summary),
        primary_role: toNullableString(row.primary_role),
        secondary_roles: toNullableStringArray(row.secondary_roles),
        years_experience: toNullableNumber(row.years_experience),
        home_market: toNullableString(row.home_market),
        markets: toNullableStringArray(row.markets),
        travel_willingness: toNullableString(row.travel_willingness),
        employment_type_preference: toNullableStringArray(
          row.employment_type_preference
        ),
        availability_mode: toNullableString(row.availability_mode),
        phone: toNullableString(row.phone),
        is_active: toNullableBoolean(row.is_active),
      };
    })
    .filter((row): row is WorkerProfileRow => row !== null);
}

function getSafeStatus(error: unknown) {
  const normalized = normalizeError(error) as AppRouteError;
  const statusCode = Number(normalized.statusCode);

  if (Number.isFinite(statusCode) && statusCode >= 400 && statusCode < 600) {
    return statusCode;
  }

  return 500;
}

function getSafeMessage(error: unknown) {
  const normalized = normalizeError(error) as AppRouteError;
  const code = String(normalized.code || "").toLowerCase();
  const message = String(normalized.message || "").toLowerCase();

  if (
    code.includes("not_authenticated") ||
    code.includes("not_logged_in") ||
    message.includes("not authenticated")
  ) {
    return {
      status: 401,
      error: "Please log in to continue.",
    };
  }

  if (
    code.includes("forbidden") ||
    code.includes("access_denied") ||
    message.includes("access denied")
  ) {
    return {
      status: 403,
      error: "You do not have access to this workspace.",
    };
  }

  if (code.includes("not_found") || message.includes("not found")) {
    return {
      status: 404,
      error: "The requested resource was not found.",
    };
  }

  return {
    status: getSafeStatus(error),
    error: "Unable to load workers.",
  };
}

async function requireContractorCompany() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw normalizeError(authError, "contractor_hr_workers_auth_failed");
  }

  if (!user) {
    throw createRouteError(
      "Not authenticated.",
      "contractor_hr_workers_not_authenticated",
      401
    );
  }

  const profileResult = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileResult.error) {
    throw normalizeError(
      profileResult.error,
      "contractor_hr_workers_profile_failed"
    );
  }

  if (!profileResult.data || profileResult.data.role !== "contractor") {
    throw createRouteError(
      "Access denied.",
      "contractor_hr_workers_forbidden",
      403
    );
  }

  const companyResult = await supabase
    .from("contractor_companies")
    .select("id, owner_id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  if (companyResult.error) {
    throw normalizeError(
      companyResult.error,
      "contractor_hr_workers_company_failed"
    );
  }

  const companies = toCompanyRows(companyResult.data);
  const company = companies[0] ?? null;

  if (!company) {
    throw createRouteError(
      "Contractor company not found.",
      "contractor_hr_workers_company_not_found",
      404
    );
  }

  return {
    supabase,
    companyId: company.id,
  };
}

export async function GET() {
  try {
    const result = await withServerErrorLogging(
      async () => {
        const { supabase } = await requireContractorCompany();

        const workersResult = await supabase
          .from("worker_profiles")
          .select(
            [
              "user_id",
              "full_name",
              "headline",
              "summary",
              "primary_role",
              "secondary_roles",
              "years_experience",
              "home_market",
              "markets",
              "travel_willingness",
              "employment_type_preference",
              "availability_mode",
              "phone",
              "is_active",
            ].join(", ")
          )
          .eq("is_active", true)
          .order("updated_at", { ascending: false });

        if (workersResult.error) {
          throw normalizeError(
            workersResult.error,
            "contractor_hr_workers_load_failed"
          );
        }

        const workers = toWorkerProfileRows(workersResult.data);

        return {
          workers,
        };
      },
      {
        message: "contractor_hr_workers_get_route_failed",
        code: "contractor_hr_workers_get_route_failed",
        source: "api",
        area: "contractor_hr_workers",
        path: "/api/contractor/hr/workers",
        role: "contractor",
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    const safe = getSafeMessage(error);

    return NextResponse.json({ error: safe.error }, { status: safe.status });
  }
}