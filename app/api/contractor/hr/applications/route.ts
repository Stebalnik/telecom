import { NextRequest, NextResponse } from "next/server";
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

type ApplicationRow = {
  id: string;
  vacancy_id: string;
  worker_id: string;
  status: string | null;
  message: string | null;
  applied_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

type VacancyRow = {
  id: string;
  contractor_company_id: string | null;
  title: string | null;
  target_role: string | null;
  market: string | null;
  employment_type: string | null;
  status: string | null;
};

type WorkerProfileRow = {
  user_id: string;
  full_name: string | null;
  headline: string | null;
  primary_role: string | null;
  years_experience: number | null;
  home_market: string | null;
  phone: string | null;
};

type ApplicationResponseItem = {
  id: string;
  vacancy_id: string;
  worker_id: string;
  status: string | null;
  message: string | null;
  applied_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  vacancy_title: string | null;
  target_role: string | null;
  vacancy_market: string | null;
  employment_type: string | null;
  vacancy_status: string | null;
  worker_name: string | null;
  worker_headline: string | null;
  worker_primary_role: string | null;
  worker_years_experience: number | null;
  worker_home_market: string | null;
  worker_phone: string | null;
};

type PatchBody = {
  applicationId?: unknown;
  status?: unknown;
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

function toApplicationRows(value: unknown): ApplicationRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((row): ApplicationRow | null => {
      const id = typeof row.id === "string" ? row.id : null;
      const vacancyId = typeof row.vacancy_id === "string" ? row.vacancy_id : null;
      const workerId = typeof row.worker_id === "string" ? row.worker_id : null;

      if (!id || !vacancyId || !workerId) {
        return null;
      }

      return {
        id,
        vacancy_id: vacancyId,
        worker_id: workerId,
        status: toNullableString(row.status),
        message: toNullableString(row.message),
        applied_at: toNullableString(row.applied_at),
        reviewed_at: toNullableString(row.reviewed_at),
        reviewed_by: toNullableString(row.reviewed_by),
      };
    })
    .filter((row): row is ApplicationRow => row !== null);
}

function toApplicationRow(value: unknown): ApplicationRow | null {
  return toApplicationRows([value])[0] ?? null;
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
        employment_type: toNullableString(row.employment_type),
        status: toNullableString(row.status),
      };
    })
    .filter((row): row is VacancyRow => row !== null);
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
        primary_role: toNullableString(row.primary_role),
        years_experience: toNullableNumber(row.years_experience),
        home_market: toNullableString(row.home_market),
        phone: toNullableString(row.phone),
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

  if (
    code.includes("validation") ||
    code.includes("invalid") ||
    message.includes("invalid")
  ) {
    return {
      status: 400,
      error: "Please check the application details and try again.",
    };
  }

  if (code.includes("not_found") || message.includes("not found")) {
    return {
      status: 404,
      error: "The requested application was not found.",
    };
  }

  return {
    status: getSafeStatus(error),
    error: "Unable to process applications.",
  };
}

async function requireContractorCompany() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw normalizeError(authError, "contractor_hr_applications_auth_failed");
  }

  if (!user) {
    throw createRouteError(
      "Not authenticated.",
      "contractor_hr_applications_not_authenticated",
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
      "contractor_hr_applications_profile_failed"
    );
  }

  if (!profileResult.data || profileResult.data.role !== "contractor") {
    throw createRouteError(
      "Access denied.",
      "contractor_hr_applications_forbidden",
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
      "contractor_hr_applications_company_failed"
    );
  }

  const companies = toCompanyRows(companyResult.data);
  const company = companies[0] ?? null;

  if (!company) {
    throw createRouteError(
      "Contractor company not found.",
      "contractor_hr_applications_company_not_found",
      404
    );
  }

  return {
    supabase,
    user,
    companyId: company.id,
  };
}

export async function GET() {
  try {
    const result = await withServerErrorLogging(
      async () => {
        const { supabase, companyId } = await requireContractorCompany();

        const vacanciesResult = await supabase
          .from("contractor_vacancies")
          .select("id, contractor_company_id, title, target_role, market, employment_type, status")
          .eq("contractor_company_id", companyId);

        if (vacanciesResult.error) {
          throw normalizeError(
            vacanciesResult.error,
            "contractor_hr_applications_vacancies_failed"
          );
        }

        const vacancies = toVacancyRows(vacanciesResult.data);

        if (vacancies.length === 0) {
          return {
            applications: [] as ApplicationResponseItem[],
          };
        }

        const vacancyIds = vacancies.map((vacancy) => vacancy.id);

        const applicationsResult = await supabase
          .from("vacancy_applications")
          .select("id, vacancy_id, worker_id, status, message, applied_at, reviewed_at, reviewed_by")
          .in("vacancy_id", vacancyIds)
          .order("applied_at", { ascending: false });

        if (applicationsResult.error) {
          throw normalizeError(
            applicationsResult.error,
            "contractor_hr_applications_load_failed"
          );
        }

        const applications = toApplicationRows(applicationsResult.data);

        if (applications.length === 0) {
          return {
            applications: [] as ApplicationResponseItem[],
          };
        }

        const workerIds = Array.from(
          new Set(applications.map((application) => application.worker_id))
        );

        let workersById = new Map<string, WorkerProfileRow>();

        if (workerIds.length > 0) {
          const workersResult = await supabase
            .from("worker_profiles")
            .select("user_id, full_name, headline, primary_role, years_experience, home_market, phone")
            .in("user_id", workerIds);

          if (workersResult.error) {
            throw normalizeError(
              workersResult.error,
              "contractor_hr_applications_workers_failed"
            );
          }

          workersById = new Map(
            toWorkerProfileRows(workersResult.data).map((worker) => [
              worker.user_id,
              worker,
            ])
          );
        }

        const vacanciesById = new Map(
          vacancies.map((vacancy) => [vacancy.id, vacancy])
        );

        const responseItems: ApplicationResponseItem[] = applications.map(
          (application) => {
            const vacancy = vacanciesById.get(application.vacancy_id) ?? null;
            const worker = workersById.get(application.worker_id) ?? null;

            return {
              id: application.id,
              vacancy_id: application.vacancy_id,
              worker_id: application.worker_id,
              status: application.status,
              message: application.message,
              applied_at: application.applied_at,
              reviewed_at: application.reviewed_at,
              reviewed_by: application.reviewed_by,
              vacancy_title: vacancy?.title ?? null,
              target_role: vacancy?.target_role ?? null,
              vacancy_market: vacancy?.market ?? null,
              employment_type: vacancy?.employment_type ?? null,
              vacancy_status: vacancy?.status ?? null,
              worker_name: worker?.full_name ?? null,
              worker_headline: worker?.headline ?? null,
              worker_primary_role: worker?.primary_role ?? null,
              worker_years_experience: worker?.years_experience ?? null,
              worker_home_market: worker?.home_market ?? null,
              worker_phone: worker?.phone ?? null,
            };
          }
        );

        return {
          applications: responseItems,
        };
      },
      {
        message: "contractor_hr_applications_get_route_failed",
        code: "contractor_hr_applications_get_route_failed",
        source: "api",
        area: "contractor_hr_applications",
        path: "/api/contractor/hr/applications",
        role: "contractor",
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    const safe = getSafeMessage(error);
    return NextResponse.json({ error: safe.error }, { status: safe.status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const result = await withServerErrorLogging(
      async () => {
        const { supabase, user, companyId } = await requireContractorCompany();

        const body = (await request.json().catch(() => null)) as unknown;

        if (!isRecord(body)) {
          throw createRouteError(
            "Invalid request body.",
            "contractor_hr_applications_validation_failed",
            400
          );
        }

        const payload = body as PatchBody;
        const applicationId =
          typeof payload.applicationId === "string"
            ? payload.applicationId.trim()
            : "";
        const nextStatus =
          typeof payload.status === "string"
            ? payload.status.trim().toLowerCase()
            : "";

        if (!applicationId) {
          throw createRouteError(
            "Application ID is required.",
            "contractor_hr_applications_validation_failed",
            400,
            { field: "applicationId" }
          );
        }

        if (
          nextStatus !== "reviewed" &&
          nextStatus !== "accepted" &&
          nextStatus !== "rejected"
        ) {
          throw createRouteError(
            "Invalid application status.",
            "contractor_hr_applications_validation_failed",
            400,
            { field: "status" }
          );
        }

        const applicationLookupResult = await supabase
          .from("vacancy_applications")
          .select("id, vacancy_id, worker_id, status, message, applied_at, reviewed_at, reviewed_by")
          .eq("id", applicationId)
          .maybeSingle();

        if (applicationLookupResult.error) {
          throw normalizeError(
            applicationLookupResult.error,
            "contractor_hr_applications_lookup_failed"
          );
        }

        const existingApplication = toApplicationRow(applicationLookupResult.data);

        if (!existingApplication) {
          throw createRouteError(
            "Application not found.",
            "contractor_hr_applications_not_found",
            404
          );
        }

        const vacancyOwnershipResult = await supabase
          .from("contractor_vacancies")
          .select("id")
          .eq("id", existingApplication.vacancy_id)
          .eq("contractor_company_id", companyId)
          .maybeSingle();

        if (vacancyOwnershipResult.error) {
          throw normalizeError(
            vacancyOwnershipResult.error,
            "contractor_hr_applications_vacancy_ownership_failed"
          );
        }

        if (!vacancyOwnershipResult.data) {
          throw createRouteError(
            "Access denied.",
            "contractor_hr_applications_forbidden",
            403
          );
        }

        const updateResult = await supabase
          .from("vacancy_applications")
          .update({
            status: nextStatus,
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
          })
          .eq("id", applicationId)
          .select("id, vacancy_id, worker_id, status, message, applied_at, reviewed_at, reviewed_by")
          .single();

        if (updateResult.error) {
          throw normalizeError(
            updateResult.error,
            "contractor_hr_applications_update_failed"
          );
        }

        const updatedApplication = toApplicationRow(updateResult.data);

        if (!updatedApplication) {
          throw createRouteError(
            "Invalid application response shape.",
            "contractor_hr_applications_response_invalid",
            500
          );
        }

        return {
          application: updatedApplication,
        };
      },
      {
        message: "contractor_hr_applications_patch_route_failed",
        code: "contractor_hr_applications_patch_route_failed",
        source: "api",
        area: "contractor_hr_applications",
        path: "/api/contractor/hr/applications",
        role: "contractor",
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    const safe = getSafeMessage(error);
    return NextResponse.json({ error: safe.error }, { status: safe.status });
  }
}