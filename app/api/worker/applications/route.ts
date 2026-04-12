import { NextRequest, NextResponse } from "next/server";
import { normalizeError } from "../../../../lib/errors/normalizeError";
import { withServerErrorLogging } from "../../../../lib/errors/withServerErrorLogging";
import { createClient } from "../../../../lib/supabase/server";

type AppRouteError = Error & {
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
};

type ApplicationRow = {
  id: string;
  vacancy_id: string;
  worker_id: string;
  status: string | null;
  message: string | null;
  applied_at: string | null;
  reviewed_at: string | null;
};

type VacancyRow = {
  id: string;
  contractor_company_id: string | null;
  title: string | null;
  target_role: string | null;
  market: string | null;
  location_text: string | null;
  employment_type: string | null;
};

type CompanyRow = {
  id: string;
  legal_name: string | null;
  dba_name: string | null;
};

type ApplicationResponseItem = {
  id: string;
  vacancy_id: string;
  status: string | null;
  message: string | null;
  applied_at: string | null;
  reviewed_at: string | null;
  vacancy_title: string | null;
  target_role: string | null;
  market: string | null;
  location_text: string | null;
  employment_type: string | null;
  company_name: string | null;
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

function toApplicationRow(value: unknown): ApplicationRow | null {
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

function toApplicationRows(value: unknown): ApplicationRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => toApplicationRow(item))
    .filter((item): item is ApplicationRow => item !== null);
}

function toVacancyRows(value: unknown): VacancyRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((row): VacancyRow | null => {
      const id = typeof row.id === "string" ? row.id : null;

      if (!id) {
        return null;
      }

      return {
        id,
        contractor_company_id: toNullableString(row.contractor_company_id),
        title: toNullableString(row.title),
        target_role: toNullableString(row.target_role),
        market: toNullableString(row.market),
        location_text: toNullableString(row.location_text),
        employment_type: toNullableString(row.employment_type),
      };
    })
    .filter((row): row is VacancyRow => row !== null);
}

function toCompanyRows(value: unknown): CompanyRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((row): CompanyRow | null => {
      const id = typeof row.id === "string" ? row.id : null;

      if (!id) {
        return null;
      }

      return {
        id,
        legal_name: toNullableString(row.legal_name),
        dba_name: toNullableString(row.dba_name),
      };
    })
    .filter((row): row is CompanyRow => row !== null);
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

  if (code.includes("not_found") || message.includes("not found")) {
    return {
      status: 404,
      error: "The requested item was not found.",
    };
  }

  return {
    status: getSafeStatus(error),
    error: "Unable to process applications.",
  };
}

async function requireSpecialistUser() {
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

  return { supabase, user };
}

export async function GET() {
  try {
    const result = await withServerErrorLogging(
      async () => {
        const { supabase, user } = await requireSpecialistUser();

        const applicationsResult = await supabase
          .from("vacancy_applications")
          .select("id, vacancy_id, worker_id, status, message, applied_at, reviewed_at")
          .eq("worker_id", user.id)
          .order("applied_at", { ascending: false });

        if (applicationsResult.error) {
          throw normalizeError(
            applicationsResult.error,
            "worker_applications_load_failed"
          );
        }

        const applications = toApplicationRows(applicationsResult.data);

        if (applications.length === 0) {
          return {
            applications: [] as ApplicationResponseItem[],
          };
        }

        const vacancyIds = applications.map((item) => item.vacancy_id);

        const vacanciesResult = await supabase
          .from("contractor_vacancies")
          .select(
            "id, contractor_company_id, title, target_role, market, location_text, employment_type"
          )
          .in("id", vacancyIds);

        if (vacanciesResult.error) {
          throw normalizeError(
            vacanciesResult.error,
            "worker_applications_vacancies_failed"
          );
        }

        const vacancies = toVacancyRows(vacanciesResult.data);
        const vacanciesById = new Map(vacancies.map((item) => [item.id, item]));

        const companyIds = Array.from(
          new Set(
            vacancies
              .map((item) => item.contractor_company_id)
              .filter((value): value is string => Boolean(value))
          )
        );

        let companiesById = new Map<string, CompanyRow>();

        if (companyIds.length > 0) {
          const companiesResult = await supabase
            .from("contractor_companies")
            .select("id, legal_name, dba_name")
            .in("id", companyIds);

          if (companiesResult.error) {
            throw normalizeError(
              companiesResult.error,
              "worker_applications_companies_failed"
            );
          }

          companiesById = new Map(
            toCompanyRows(companiesResult.data).map((company) => [company.id, company])
          );
        }

        const responseItems: ApplicationResponseItem[] = applications.map(
          (application) => {
            const vacancy = vacanciesById.get(application.vacancy_id) ?? null;
            const company = vacancy?.contractor_company_id
              ? companiesById.get(vacancy.contractor_company_id) ?? null
              : null;

            return {
              id: application.id,
              vacancy_id: application.vacancy_id,
              status: application.status,
              message: application.message,
              applied_at: application.applied_at,
              reviewed_at: application.reviewed_at,
              vacancy_title: vacancy?.title ?? null,
              target_role: vacancy?.target_role ?? null,
              market: vacancy?.market ?? null,
              location_text: vacancy?.location_text ?? null,
              employment_type: vacancy?.employment_type ?? null,
              company_name:
                company?.dba_name?.trim() ||
                company?.legal_name?.trim() ||
                null,
            };
          }
        );

        return {
          applications: responseItems,
        };
      },
      {
        message: "worker_applications_get_route_failed",
        code: "worker_applications_get_route_failed",
        source: "api",
        area: "worker_applications",
        path: "/api/worker/applications",
        role: "specialist",
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    const safe = getSafeMessage(error);

    return NextResponse.json({ error: safe.error }, { status: safe.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await withServerErrorLogging(
      async () => {
        const { supabase, user } = await requireSpecialistUser();

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
        message: "worker_applications_post_route_failed",
        code: "worker_applications_post_route_failed",
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