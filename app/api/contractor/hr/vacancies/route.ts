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
  is_public: boolean | null;
  created_at: string | null;
};

type VacancyApplicationCountRow = {
  vacancy_id: string;
  count: number;
};

type VacancyResponseItem = VacancyRow & {
  application_count: number;
};

type CreateVacancyBody = {
  title?: unknown;
  targetRole?: unknown;
  description?: unknown;
  market?: unknown;
  locationText?: unknown;
  employmentType?: unknown;
  payType?: unknown;
  payRangeMin?: unknown;
  payRangeMax?: unknown;
  startDate?: unknown;
  durationType?: unknown;
  workersNeeded?: unknown;
  isPublic?: unknown;
};

type UpdateVacancyBody = {
  vacancyId?: unknown;
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

function toNullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
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
        is_public: toNullableBoolean(row.is_public),
        created_at: toNullableString(row.created_at),
      };
    })
    .filter((row): row is VacancyRow => row !== null);
}

function toVacancyRow(value: unknown): VacancyRow | null {
  const rows = toVacancyRows([value]);
  return rows[0] ?? null;
}

function toApplicationCountRows(value: unknown): VacancyApplicationCountRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((row): VacancyApplicationCountRow | null => {
      const vacancyId = typeof row.vacancy_id === "string" ? row.vacancy_id : null;
      const rawCount = row.count;
      const count =
        typeof rawCount === "number"
          ? rawCount
          : typeof rawCount === "string" && rawCount.trim() !== ""
          ? Number(rawCount)
          : NaN;

      if (!vacancyId || !Number.isFinite(count)) {
        return null;
      }

      return {
        vacancy_id: vacancyId,
        count,
      };
    })
    .filter((row): row is VacancyApplicationCountRow => row !== null);
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
    code.includes("validation") ||
    code.includes("invalid") ||
    message.includes("required")
  ) {
    return {
      status: 400,
      error: "Please check the vacancy details and try again.",
    };
  }

  if (code.includes("not_found") || message.includes("not found")) {
    return {
      status: 404,
      error: "The requested vacancy was not found.",
    };
  }

  return {
    status: getSafeStatus(error),
    error: "Unable to process HR vacancies.",
  };
}

async function requireContractorCompany() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw normalizeError(authError, "contractor_hr_vacancies_auth_failed");
  }

  if (!user) {
    throw createRouteError(
      "Not authenticated.",
      "contractor_hr_vacancies_not_authenticated",
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
      "contractor_hr_vacancies_profile_failed"
    );
  }

  if (!profileResult.data || profileResult.data.role !== "contractor") {
    throw createRouteError(
      "Access denied.",
      "contractor_hr_vacancies_forbidden",
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
      "contractor_hr_vacancies_company_failed"
    );
  }

  const companies = toCompanyRows(companyResult.data);
  const company = companies[0] ?? null;

  if (!company) {
    throw createRouteError(
      "Contractor company not found.",
      "contractor_hr_vacancies_company_not_found",
      404
    );
  }

  return {
    supabase,
    user,
    companyId: company.id,
  };
}

function parseCreateBody(body: unknown) {
  if (!isRecord(body)) {
    throw createRouteError(
      "Invalid request body.",
      "contractor_hr_vacancies_validation_failed",
      400
    );
  }

  const payload = body as CreateVacancyBody;

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const targetRole =
    typeof payload.targetRole === "string" ? payload.targetRole.trim() : "";
  const description =
    typeof payload.description === "string"
      ? payload.description.trim()
      : "";
  const market = typeof payload.market === "string" ? payload.market.trim() : "";
  const locationText =
    typeof payload.locationText === "string"
      ? payload.locationText.trim()
      : "";
  const employmentType =
    typeof payload.employmentType === "string"
      ? payload.employmentType.trim()
      : "";
  const payType =
    typeof payload.payType === "string" ? payload.payType.trim() : "";
  const startDate =
    typeof payload.startDate === "string" ? payload.startDate.trim() : "";
  const durationType =
    typeof payload.durationType === "string"
      ? payload.durationType.trim()
      : "";
  const isPublic =
    typeof payload.isPublic === "boolean" ? payload.isPublic : true;

  const payRangeMin =
    typeof payload.payRangeMin === "number"
      ? payload.payRangeMin
      : typeof payload.payRangeMin === "string" &&
        payload.payRangeMin.trim() !== ""
      ? Number(payload.payRangeMin)
      : null;

  const payRangeMax =
    typeof payload.payRangeMax === "number"
      ? payload.payRangeMax
      : typeof payload.payRangeMax === "string" &&
        payload.payRangeMax.trim() !== ""
      ? Number(payload.payRangeMax)
      : null;

  const workersNeeded =
    typeof payload.workersNeeded === "number"
      ? payload.workersNeeded
      : typeof payload.workersNeeded === "string" &&
        payload.workersNeeded.trim() !== ""
      ? Number(payload.workersNeeded)
      : null;

  if (!title) {
    throw createRouteError(
      "Vacancy title is required.",
      "contractor_hr_vacancies_validation_failed",
      400,
      { field: "title" }
    );
  }

  if (!targetRole) {
    throw createRouteError(
      "Target role is required.",
      "contractor_hr_vacancies_validation_failed",
      400,
      { field: "targetRole" }
    );
  }

  if (payRangeMin !== null && !Number.isFinite(payRangeMin)) {
    throw createRouteError(
      "Invalid minimum pay range.",
      "contractor_hr_vacancies_validation_failed",
      400,
      { field: "payRangeMin" }
    );
  }

  if (payRangeMax !== null && !Number.isFinite(payRangeMax)) {
    throw createRouteError(
      "Invalid maximum pay range.",
      "contractor_hr_vacancies_validation_failed",
      400,
      { field: "payRangeMax" }
    );
  }

  if (
    payRangeMin !== null &&
    payRangeMax !== null &&
    payRangeMin > payRangeMax
  ) {
    throw createRouteError(
      "Minimum pay cannot be greater than maximum pay.",
      "contractor_hr_vacancies_validation_failed",
      400,
      { field: "payRangeMin" }
    );
  }

  if (
    workersNeeded !== null &&
    (!Number.isFinite(workersNeeded) || workersNeeded <= 0)
  ) {
    throw createRouteError(
      "Workers needed must be greater than zero.",
      "contractor_hr_vacancies_validation_failed",
      400,
      { field: "workersNeeded" }
    );
  }

  return {
    title,
    targetRole,
    description: description || null,
    market: market || null,
    locationText: locationText || null,
    employmentType: employmentType || null,
    payType: payType || null,
    payRangeMin,
    payRangeMax,
    startDate: startDate || null,
    durationType: durationType || null,
    workersNeeded,
    isPublic,
  };
}

function parseUpdateBody(body: unknown) {
  if (!isRecord(body)) {
    throw createRouteError(
      "Invalid request body.",
      "contractor_hr_vacancies_validation_failed",
      400
    );
  }

  const payload = body as UpdateVacancyBody;
  const vacancyId =
    typeof payload.vacancyId === "string" ? payload.vacancyId.trim() : "";
  const status =
    typeof payload.status === "string" ? payload.status.trim().toLowerCase() : "";

  if (!vacancyId) {
    throw createRouteError(
      "Vacancy ID is required.",
      "contractor_hr_vacancies_validation_failed",
      400,
      { field: "vacancyId" }
    );
  }

  if (status !== "open" && status !== "closed" && status !== "draft") {
    throw createRouteError(
      "Invalid vacancy status.",
      "contractor_hr_vacancies_validation_failed",
      400,
      { field: "status" }
    );
  }

  return { vacancyId, status };
}

async function getApplicationCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  vacancyIds: string[]
) {
  if (vacancyIds.length === 0) {
    return new Map<string, number>();
  }

  const countsResult = await supabase
    .from("vacancy_applications")
    .select("vacancy_id, count:id")
    .in("vacancy_id", vacancyIds);

  if (countsResult.error) {
    throw normalizeError(
      countsResult.error,
      "contractor_hr_vacancies_counts_failed"
    );
  }

  const rawCounts = toApplicationCountRows(countsResult.data);
  const countsMap = new Map<string, number>();

  for (const row of rawCounts) {
    countsMap.set(row.vacancy_id, (countsMap.get(row.vacancy_id) ?? 0) + row.count);
  }

  return countsMap;
}

export async function GET() {
  try {
    const result = await withServerErrorLogging(
      async () => {
        const { supabase, companyId } = await requireContractorCompany();

        const vacanciesResult = await supabase
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
              "is_public",
              "created_at",
            ].join(", ")
          )
          .eq("contractor_company_id", companyId)
          .order("created_at", { ascending: false });

        if (vacanciesResult.error) {
          throw normalizeError(
            vacanciesResult.error,
            "contractor_hr_vacancies_load_failed"
          );
        }

        const vacancies = toVacancyRows(vacanciesResult.data);
        const countsMap = await getApplicationCounts(
          supabase,
          vacancies.map((vacancy) => vacancy.id)
        );

        const responseItems: VacancyResponseItem[] = vacancies.map((vacancy) => ({
          ...vacancy,
          application_count: countsMap.get(vacancy.id) ?? 0,
        }));

        return {
          vacancies: responseItems,
        };
      },
      {
        message: "contractor_hr_vacancies_get_route_failed",
        code: "contractor_hr_vacancies_get_route_failed",
        source: "api",
        area: "contractor_hr_vacancies",
        path: "/api/contractor/hr/vacancies",
        role: "contractor",
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
        const { supabase, user, companyId } = await requireContractorCompany();
        const body = await request.json().catch(() => null);
        const parsed = parseCreateBody(body);

        const insertResult = await supabase
          .from("contractor_vacancies")
          .insert({
            contractor_company_id: companyId,
            title: parsed.title,
            target_role: parsed.targetRole,
            description: parsed.description,
            market: parsed.market,
            location_text: parsed.locationText,
            employment_type: parsed.employmentType,
            pay_type: parsed.payType,
            pay_range_min: parsed.payRangeMin,
            pay_range_max: parsed.payRangeMax,
            start_date: parsed.startDate,
            duration_type: parsed.durationType,
            workers_needed: parsed.workersNeeded,
            status: "open",
            is_public: parsed.isPublic,
            created_by: user.id,
          })
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
              "is_public",
              "created_at",
            ].join(", ")
          )
          .single();

        if (insertResult.error) {
          throw normalizeError(
            insertResult.error,
            "contractor_hr_vacancies_insert_failed"
          );
        }

        const vacancy = toVacancyRow(insertResult.data);

        if (!vacancy) {
          throw createRouteError(
            "Invalid vacancy response shape.",
            "contractor_hr_vacancies_response_invalid",
            500
          );
        }

        return {
          vacancy: {
            ...vacancy,
            application_count: 0,
          } satisfies VacancyResponseItem,
        };
      },
      {
        message: "contractor_hr_vacancies_post_route_failed",
        code: "contractor_hr_vacancies_post_route_failed",
        source: "api",
        area: "contractor_hr_vacancies",
        path: "/api/contractor/hr/vacancies",
        role: "contractor",
      }
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const safe = getSafeMessage(error);
    return NextResponse.json({ error: safe.error }, { status: safe.status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const result = await withServerErrorLogging(
      async () => {
        const { supabase, companyId } = await requireContractorCompany();
        const body = await request.json().catch(() => null);
        const parsed = parseUpdateBody(body);

        const existingResult = await supabase
          .from("contractor_vacancies")
          .select("id")
          .eq("id", parsed.vacancyId)
          .eq("contractor_company_id", companyId)
          .maybeSingle();

        if (existingResult.error) {
          throw normalizeError(
            existingResult.error,
            "contractor_hr_vacancies_lookup_failed"
          );
        }

        if (!existingResult.data) {
          throw createRouteError(
            "Vacancy not found.",
            "contractor_hr_vacancies_not_found",
            404
          );
        }

        const updateResult = await supabase
          .from("contractor_vacancies")
          .update({
            status: parsed.status,
          })
          .eq("id", parsed.vacancyId)
          .eq("contractor_company_id", companyId)
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
              "is_public",
              "created_at",
            ].join(", ")
          )
          .single();

        if (updateResult.error) {
          throw normalizeError(
            updateResult.error,
            "contractor_hr_vacancies_update_failed"
          );
        }

        const vacancy = toVacancyRow(updateResult.data);

        if (!vacancy) {
          throw createRouteError(
            "Invalid vacancy response shape.",
            "contractor_hr_vacancies_response_invalid",
            500
          );
        }

        return {
          vacancy,
        };
      },
      {
        message: "contractor_hr_vacancies_patch_route_failed",
        code: "contractor_hr_vacancies_patch_route_failed",
        source: "api",
        area: "contractor_hr_vacancies",
        path: "/api/contractor/hr/vacancies",
        role: "contractor",
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    const safe = getSafeMessage(error);
    return NextResponse.json({ error: safe.error }, { status: safe.status });
  }
}