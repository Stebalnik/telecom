import { NextRequest, NextResponse } from "next/server";
import { normalizeError } from "../../../../lib/errors/normalizeError";
import { createClient } from "../../../../lib/supabase/server";
import { withServerErrorLogging } from "../../../../lib/errors/withServerErrorLogging";
import { isValidVacancyMarket } from "../../../../lib/geo/usStates";

type AppRouteError = Error & {
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
};

type VacancyRow = {
  id: string;
  contractor_company_id: string | null;
  title: string | null;
  target_role: string | null;
  description: string | null;
  market: string | null;
  location_text: string | null;
  employment_type: string | null;
  pay_type: string | null;
  pay_range_min: number | null;
  pay_range_max: number | null;
  start_date: string | null;
  duration_type: string | null;
  workers_needed: number | null;
  status: string | null;
};

type CompanyRow = {
  id: string;
  legal_name: string | null;
  dba_name: string | null;
};

type ApplicationRow = {
  vacancy_id: string;
  status: string | null;
};

type VacancyResponseItem = {
  id: string;
  title: string | null;
  target_role: string | null;
  description: string | null;
  market: string | null;
  location_text: string | null;
  employment_type: string | null;
  pay_type: string | null;
  pay_range_min: number | null;
  pay_range_max: number | null;
  start_date: string | null;
  duration_type: string | null;
  workers_needed: number | null;
  status: string | null;
  company_name: string | null;
  has_applied: boolean;
  application_status: string | null;
};

type VacancyFilters = {
  search: string;
  market: string;
  role: string;
  employmentType: string;
  payType: string;
  durationType: string;
  applied: "" | "applied" | "not_applied";
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

function normalizeQueryParam(value: string | null) {
  return value?.trim() ?? "";
}

function parseFilters(request: NextRequest): VacancyFilters {
  const search = normalizeQueryParam(request.nextUrl.searchParams.get("search"));
  const market = normalizeQueryParam(request.nextUrl.searchParams.get("market"));
  const role = normalizeQueryParam(request.nextUrl.searchParams.get("role"));
  const employmentType = normalizeQueryParam(
    request.nextUrl.searchParams.get("employmentType")
  );
  const payType = normalizeQueryParam(request.nextUrl.searchParams.get("payType"));
  const durationType = normalizeQueryParam(
    request.nextUrl.searchParams.get("durationType")
  );
  const appliedParam = normalizeQueryParam(
    request.nextUrl.searchParams.get("applied")
  ).toLowerCase();

  const applied: VacancyFilters["applied"] =
    appliedParam === "applied" || appliedParam === "not_applied"
      ? appliedParam
      : "";

  if (market && !isValidVacancyMarket(market)) {
    throw createRouteError(
      "Invalid market filter.",
      "worker_vacancies_validation_failed",
      400,
      { field: "market" }
    );
  }

  return {
    search,
    market,
    role,
    employmentType,
    payType,
    durationType,
    applied,
  };
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
        description: toNullableString(row.description),
        market: toNullableString(row.market),
        location_text: toNullableString(row.location_text),
        employment_type: toNullableString(row.employment_type),
        pay_type: toNullableString(row.pay_type),
        pay_range_min: toNullableNumber(row.pay_range_min),
        pay_range_max: toNullableNumber(row.pay_range_max),
        start_date: toNullableString(row.start_date),
        duration_type: toNullableString(row.duration_type),
        workers_needed: toNullableNumber(row.workers_needed),
        status: toNullableString(row.status),
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

function toApplicationRows(value: unknown): ApplicationRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((row): ApplicationRow | null => {
      const vacancyId =
        typeof row.vacancy_id === "string" ? row.vacancy_id : null;

      if (!vacancyId) {
        return null;
      }

      return {
        vacancy_id: vacancyId,
        status: toNullableString(row.status),
      };
    })
    .filter((row): row is ApplicationRow => row !== null);
}

function matchesSearch(
  item: VacancyResponseItem,
  normalizedSearch: string
): boolean {
  if (!normalizedSearch) {
    return true;
  }

  return [
    item.title,
    item.target_role,
    item.market,
    item.location_text,
    item.company_name,
    item.description,
  ]
    .filter(Boolean)
    .some((value) =>
      String(value).toLowerCase().includes(normalizedSearch)
    );
}

function applyFilters(
  items: VacancyResponseItem[],
  filters: VacancyFilters
): VacancyResponseItem[] {
  const normalizedSearch = filters.search.toLowerCase();

  return items.filter((item) => {
    const matchesMarket =
      !filters.market || item.market === filters.market;

    const matchesRole =
      !filters.role || item.target_role === filters.role;

    const matchesEmploymentType =
      !filters.employmentType ||
      item.employment_type === filters.employmentType;

    const matchesPayType =
      !filters.payType || item.pay_type === filters.payType;

    const matchesDurationType =
      !filters.durationType || item.duration_type === filters.durationType;

    const matchesApplied =
      !filters.applied ||
      (filters.applied === "applied" && item.has_applied) ||
      (filters.applied === "not_applied" && !item.has_applied);

    return (
      matchesSearch(item, normalizedSearch) &&
      matchesMarket &&
      matchesRole &&
      matchesEmploymentType &&
      matchesPayType &&
      matchesDurationType &&
      matchesApplied
    );
  });
}

function getSafeStatus(error: unknown) {
  const normalized = normalizeError(error);
  const statusCode = Number(normalized.statusCode);

  if (Number.isFinite(statusCode) && statusCode >= 400 && statusCode < 600) {
    return statusCode;
  }

  return 500;
}

function getSafeMessage(error: unknown) {
  const normalized = normalizeError(error);
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
    code.includes("validation") ||
    code.includes("invalid") ||
    message.includes("invalid")
  ) {
    return {
      status: 400,
      error: "Please check the vacancy filters and try again.",
    };
  }

  return {
    status: getSafeStatus(error),
    error: "Unable to load vacancies.",
  };
}

export async function GET(request: NextRequest) {
  try {
    const result = await withServerErrorLogging(
      async () => {
        const filters = parseFilters(request);
        const supabase = await createClient();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw normalizeError(authError, "worker_vacancies_auth_failed");
        }

        if (!user) {
          throw createRouteError(
            "Not authenticated.",
            "worker_vacancies_not_authenticated",
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
            "worker_vacancies_profile_failed"
          );
        }

        if (!profileResult.data || profileResult.data.role !== "specialist") {
          throw createRouteError(
            "Access denied.",
            "worker_vacancies_forbidden",
            403
          );
        }

        let vacanciesQuery = supabase
          .from("contractor_vacancies")
          .select(
            [
              "id",
              "contractor_company_id",
              "title",
              "target_role",
              "description",
              "market",
              "location_text",
              "employment_type",
              "pay_type",
              "pay_range_min",
              "pay_range_max",
              "start_date",
              "duration_type",
              "workers_needed",
              "status",
            ].join(", ")
          )
          .eq("is_public", true)
          .eq("status", "open")
          .order("created_at", { ascending: false });

        if (filters.market) {
          vacanciesQuery = vacanciesQuery.eq("market", filters.market);
        }

        if (filters.role) {
          vacanciesQuery = vacanciesQuery.eq("target_role", filters.role);
        }

        if (filters.employmentType) {
          vacanciesQuery = vacanciesQuery.eq(
            "employment_type",
            filters.employmentType
          );
        }

        if (filters.payType) {
          vacanciesQuery = vacanciesQuery.eq("pay_type", filters.payType);
        }

        if (filters.durationType) {
          vacanciesQuery = vacanciesQuery.eq(
            "duration_type",
            filters.durationType
          );
        }

        const vacanciesResult = await vacanciesQuery;

        if (vacanciesResult.error) {
          throw normalizeError(
            vacanciesResult.error,
            "worker_vacancies_load_failed"
          );
        }

        const vacancies = toVacancyRows(vacanciesResult.data);

        if (vacancies.length === 0) {
          return {
            vacancies: [] as VacancyResponseItem[],
          };
        }

        const companyIds = Array.from(
          new Set(
            vacancies
              .map((item) => item.contractor_company_id)
              .filter((value): value is string => Boolean(value))
          )
        );

        const vacancyIds = vacancies.map((item) => item.id);

        let companiesById = new Map<string, CompanyRow>();
        let applicationsByVacancyId = new Map<string, ApplicationRow>();

        if (companyIds.length > 0) {
          const companiesResult = await supabase
            .from("contractor_companies")
            .select("id, legal_name, dba_name")
            .in("id", companyIds);

          if (companiesResult.error) {
            throw normalizeError(
              companiesResult.error,
              "worker_vacancies_companies_failed"
            );
          }

          companiesById = new Map(
            toCompanyRows(companiesResult.data).map((company) => [
              company.id,
              company,
            ])
          );
        }

        if (vacancyIds.length > 0) {
          const applicationsResult = await supabase
            .from("vacancy_applications")
            .select("vacancy_id, status")
            .eq("worker_id", user.id)
            .in("vacancy_id", vacancyIds);

          if (applicationsResult.error) {
            throw normalizeError(
              applicationsResult.error,
              "worker_vacancies_applications_failed"
            );
          }

          applicationsByVacancyId = new Map(
            toApplicationRows(applicationsResult.data).map((application) => [
              application.vacancy_id,
              application,
            ])
          );
        }

        const responseItems: VacancyResponseItem[] = vacancies.map((vacancy) => {
          const company = vacancy.contractor_company_id
            ? companiesById.get(vacancy.contractor_company_id) ?? null
            : null;

          const application = applicationsByVacancyId.get(vacancy.id) ?? null;

          return {
            id: vacancy.id,
            title: vacancy.title,
            target_role: vacancy.target_role,
            description: vacancy.description,
            market: vacancy.market,
            location_text: vacancy.location_text,
            employment_type: vacancy.employment_type,
            pay_type: vacancy.pay_type,
            pay_range_min: vacancy.pay_range_min,
            pay_range_max: vacancy.pay_range_max,
            start_date: vacancy.start_date,
            duration_type: vacancy.duration_type,
            workers_needed: vacancy.workers_needed,
            status: vacancy.status,
            company_name:
              company?.dba_name?.trim() ||
              company?.legal_name?.trim() ||
              null,
            has_applied: Boolean(application),
            application_status: application?.status ?? null,
          };
        });

        return {
          vacancies: applyFilters(responseItems, filters),
        };
      },
      {
        message: "worker_vacancies_route_failed",
        code: "worker_vacancies_route_failed",
        source: "api",
        area: "worker_vacancies",
        path: "/api/worker/vacancies",
        role: "specialist",
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    const safe = getSafeMessage(error);

    return NextResponse.json({ error: safe.error }, { status: safe.status });
  }
}