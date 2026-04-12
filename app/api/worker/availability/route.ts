import { NextRequest, NextResponse } from "next/server";
import { normalizeError } from "../../../../lib/errors/normalizeError";
import { withServerErrorLogging } from "../../../../lib/errors/withServerErrorLogging";
import { createClient } from "../../../../lib/supabase/server";

type AppRouteError = Error & {
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
};

type VacancyApplicationInsertRow = {
  id: string;
  vacancy_id: string;
  worker_id: string;
  status: string | null;
  message: string | null;
  applied_at: string | null;
  reviewed_at: string | null;
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

function toApplicationRow(value: unknown): VacancyApplicationInsertRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === "string" ? value.id : null;
  const vacancyId = typeof value.vacancy_id === "string" ? value.vacancy_id : null;
  const workerId = typeof value.worker_id === "string" ? value.worker_id : null;

  if (!id || !vacancyId || !workerId) {
    return null;
  }

  return {
    id,
    vacancy_id: vacancyId,
    worker_id: workerId,
    status: toNullableString(value.status),
    message: toNullableString(value.message),
    applied_at: toNullableString(value.applied_at),
    reviewed_at: toNullableString(value.reviewed_at),
  };
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

  if (code.includes("not_authenticated") || message.includes("not authenticated")) {
    return {
      status: 401,
      error: "Please log in to continue.",
    };
  }

  if (
    code.includes("forbidden") ||
    message.includes("forbidden") ||
    code.includes("access_denied") ||
    message.includes("access denied")
  ) {
    return {
      status: 403,
      error: "You do not have access to this workspace.",
    };
  }

  if (
    code.includes("duplicate") ||
    code.includes("23505") ||
    message.includes("duplicate key")
  ) {
    return {
      status: 409,
      error: "You have already applied to this vacancy.",
    };
  }

  if (code.includes("validation") || code.includes("invalid")) {
    return {
      status: 400,
      error: "Please check the application details and try again.",
    };
  }

  return {
    status: getSafeStatus(error),
    error: "Unable to submit application.",
  };
}

export async function POST(request: NextRequest) {
  try {
    const result = await withServerErrorLogging(
      async () => {
        const supabase = await createClient();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw normalizeError(authError, "worker_applications_auth_failed");
        }

        if (!user) {
          throw createRouteError(
            "Not authenticated.",
            "worker_applications_not_authenticated",
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
            "worker_applications_profile_failed"
          );
        }

        if (!profileResult.data || profileResult.data.role !== "specialist") {
          throw createRouteError(
            "Access denied.",
            "worker_applications_forbidden",
            403
          );
        }

        const body = (await request.json().catch(() => null)) as unknown;

        if (!isRecord(body)) {
          throw createRouteError(
            "Invalid request body.",
            "worker_applications_validation_failed",
            400
          );
        }

        const vacancyId =
          typeof body.vacancyId === "string" ? body.vacancyId.trim() : "";
        const message =
          typeof body.message === "string" ? body.message.trim() : "";

        if (!vacancyId) {
          throw createRouteError(
            "Vacancy ID is required.",
            "worker_applications_validation_failed",
            400,
            { field: "vacancyId" }
          );
        }

        const vacancyResult = await supabase
          .from("contractor_vacancies")
          .select("id, is_public, status")
          .eq("id", vacancyId)
          .maybeSingle();

        if (vacancyResult.error) {
          throw normalizeError(
            vacancyResult.error,
            "worker_applications_vacancy_lookup_failed"
          );
        }

        if (!vacancyResult.data) {
          throw createRouteError(
            "Vacancy not found.",
            "worker_applications_vacancy_not_found",
            404
          );
        }

        if (vacancyResult.data.is_public !== true) {
          throw createRouteError(
            "This vacancy is not available for public applications.",
            "worker_applications_vacancy_not_public",
            403
          );
        }

        if (String(vacancyResult.data.status || "").toLowerCase() !== "open") {
          throw createRouteError(
            "This vacancy is no longer open.",
            "worker_applications_vacancy_closed",
            409
          );
        }

        const existingApplicationResult = await supabase
          .from("vacancy_applications")
          .select("id")
          .eq("vacancy_id", vacancyId)
          .eq("worker_id", user.id)
          .maybeSingle();

        if (existingApplicationResult.error) {
          throw normalizeError(
            existingApplicationResult.error,
            "worker_applications_existing_lookup_failed"
          );
        }

        if (existingApplicationResult.data?.id) {
          throw createRouteError(
            "Application already exists.",
            "worker_applications_duplicate",
            409
          );
        }

        const insertResult = await supabase
          .from("vacancy_applications")
          .insert({
            vacancy_id: vacancyId,
            worker_id: user.id,
            message: message || null,
            status: "submitted",
          })
          .select("id, vacancy_id, worker_id, status, message, applied_at, reviewed_at")
          .single();

        if (insertResult.error) {
          throw normalizeError(
            insertResult.error,
            "worker_applications_insert_failed"
          );
        }

        const application = toApplicationRow(insertResult.data);

        if (!application) {
          throw createRouteError(
            "Invalid application response shape.",
            "worker_applications_response_invalid",
            500
          );
        }

        return {
          application,
        };
      },
      {
        message: "worker_applications_route_failed",
        code: "worker_applications_route_failed",
        source: "api",
        area: "worker_applications",
        path: "/api/worker/applications",
        role: "specialist",
      }
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const safe = getSafeMessage(error);

    return NextResponse.json({ error: safe.error }, { status: safe.status });
  }
}