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

type InvitationRow = {
  id: string;
  contractor_company_id: string | null;
  worker_id: string;
  team_id: string | null;
  vacancy_id: string | null;
  message: string | null;
  status: string | null;
  invited_at: string | null;
  responded_at: string | null;
};

type VacancyRow = {
  id: string;
  contractor_company_id: string | null;
  title: string | null;
  target_role: string | null;
};

type WorkerProfileRow = {
  user_id: string;
  full_name: string | null;
  headline: string | null;
  primary_role: string | null;
};

type InvitationResponseItem = {
  id: string;
  status: string | null;
  message: string | null;
  invited_at: string | null;
  responded_at: string | null;
  worker_id: string;
  contractor_company_id: string | null;
  vacancy_id: string | null;
  team_id: string | null;
  worker_name: string | null;
  worker_headline: string | null;
  worker_primary_role: string | null;
  vacancy_title: string | null;
  target_role: string | null;
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

function toInvitationRows(value: unknown): InvitationRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((row): InvitationRow | null => {
      const id = typeof row.id === "string" ? row.id : null;
      const workerId = typeof row.worker_id === "string" ? row.worker_id : null;

      if (!id || !workerId) {
        return null;
      }

      return {
        id,
        contractor_company_id: toNullableString(row.contractor_company_id),
        worker_id: workerId,
        team_id: toNullableString(row.team_id),
        vacancy_id: toNullableString(row.vacancy_id),
        message: toNullableString(row.message),
        status: toNullableString(row.status),
        invited_at: toNullableString(row.invited_at),
        responded_at: toNullableString(row.responded_at),
      };
    })
    .filter((row): row is InvitationRow => row !== null);
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
    error: "Unable to load invitations.",
  };
}

async function requireContractorCompany() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw normalizeError(authError, "contractor_hr_invitations_auth_failed");
  }

  if (!user) {
    throw createRouteError(
      "Not authenticated.",
      "contractor_hr_invitations_not_authenticated",
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
      "contractor_hr_invitations_profile_failed"
    );
  }

  if (!profileResult.data || profileResult.data.role !== "contractor") {
    throw createRouteError(
      "Access denied.",
      "contractor_hr_invitations_forbidden",
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
      "contractor_hr_invitations_company_failed"
    );
  }

  const companies = toCompanyRows(companyResult.data);
  const company = companies[0] ?? null;

  if (!company) {
    throw createRouteError(
      "Contractor company not found.",
      "contractor_hr_invitations_company_not_found",
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
        const { supabase, companyId } = await requireContractorCompany();

        const invitationsResult = await supabase
          .from("worker_invitations")
          .select(
            "id, contractor_company_id, worker_id, team_id, vacancy_id, message, status, invited_at, responded_at"
          )
          .eq("contractor_company_id", companyId)
          .order("invited_at", { ascending: false });

        if (invitationsResult.error) {
          throw normalizeError(
            invitationsResult.error,
            "contractor_hr_invitations_load_failed"
          );
        }

        const invitations = toInvitationRows(invitationsResult.data);

        if (invitations.length === 0) {
          return {
            invitations: [] as InvitationResponseItem[],
          };
        }

        const vacancyIds = Array.from(
          new Set(
            invitations
              .map((item) => item.vacancy_id)
              .filter((value): value is string => Boolean(value))
          )
        );

        const workerIds = Array.from(
          new Set(invitations.map((item) => item.worker_id))
        );

        let vacanciesById = new Map<string, VacancyRow>();
        let workersById = new Map<string, WorkerProfileRow>();

        if (vacancyIds.length > 0) {
          const vacanciesResult = await supabase
            .from("contractor_vacancies")
            .select("id, contractor_company_id, title, target_role")
            .in("id", vacancyIds)
            .eq("contractor_company_id", companyId);

          if (vacanciesResult.error) {
            throw normalizeError(
              vacanciesResult.error,
              "contractor_hr_invitations_vacancies_failed"
            );
          }

          vacanciesById = new Map(
            toVacancyRows(vacanciesResult.data).map((vacancy) => [
              vacancy.id,
              vacancy,
            ])
          );
        }

        if (workerIds.length > 0) {
          const workersResult = await supabase
            .from("worker_profiles")
            .select("user_id, full_name, headline, primary_role")
            .in("user_id", workerIds);

          if (workersResult.error) {
            throw normalizeError(
              workersResult.error,
              "contractor_hr_invitations_workers_failed"
            );
          }

          workersById = new Map(
            toWorkerProfileRows(workersResult.data).map((worker) => [
              worker.user_id,
              worker,
            ])
          );
        }

        const responseItems: InvitationResponseItem[] = invitations.map(
          (invitation) => {
            const worker = workersById.get(invitation.worker_id) ?? null;
            const vacancy = invitation.vacancy_id
              ? vacanciesById.get(invitation.vacancy_id) ?? null
              : null;

            return {
              id: invitation.id,
              status: invitation.status,
              message: invitation.message,
              invited_at: invitation.invited_at,
              responded_at: invitation.responded_at,
              worker_id: invitation.worker_id,
              contractor_company_id: invitation.contractor_company_id,
              vacancy_id: invitation.vacancy_id,
              team_id: invitation.team_id,
              worker_name: worker?.full_name ?? null,
              worker_headline: worker?.headline ?? null,
              worker_primary_role: worker?.primary_role ?? null,
              vacancy_title: vacancy?.title ?? null,
              target_role: vacancy?.target_role ?? null,
            };
          }
        );

        return {
          invitations: responseItems,
        };
      },
      {
        message: "contractor_hr_invitations_get_route_failed",
        code: "contractor_hr_invitations_get_route_failed",
        source: "api",
        area: "contractor_hr_invitations",
        path: "/api/contractor/hr/invitations",
        role: "contractor",
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    const safe = getSafeMessage(error);

    return NextResponse.json({ error: safe.error }, { status: safe.status });
  }
}