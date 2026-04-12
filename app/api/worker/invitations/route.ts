import { NextRequest, NextResponse } from "next/server";
import { normalizeError } from "../../../../lib/errors/normalizeError";
import { withServerErrorLogging } from "../../../../lib/errors/withServerErrorLogging";
import { createClient } from "../../../../lib/supabase/server";

type AppRouteError = Error & {
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
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

type CompanyRow = {
  id: string;
  legal_name: string | null;
  dba_name: string | null;
};

type InvitationResponseItem = {
  id: string;
  status: string | null;
  message: string | null;
  invited_at: string | null;
  responded_at: string | null;
  contractor_company_id: string | null;
  vacancy_id: string | null;
  team_id: string | null;
  company_name: string | null;
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

function toInvitationRow(value: unknown): InvitationRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === "string" ? value.id : null;
  const workerId = typeof value.worker_id === "string" ? value.worker_id : null;

  if (!id || !workerId) {
    return null;
  }

  return {
    id,
    contractor_company_id: toNullableString(value.contractor_company_id),
    worker_id: workerId,
    team_id: toNullableString(value.team_id),
    vacancy_id: toNullableString(value.vacancy_id),
    message: toNullableString(value.message),
    status: toNullableString(value.status),
    invited_at: toNullableString(value.invited_at),
    responded_at: toNullableString(value.responded_at),
  };
}

function toInvitationRows(value: unknown): InvitationRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => toInvitationRow(item))
    .filter((item): item is InvitationRow => item !== null);
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

  if (code.includes("validation") || code.includes("invalid")) {
    return {
      status: 400,
      error: "Please check the invitation details and try again.",
    };
  }

  if (code.includes("not_found") || message.includes("not found")) {
    return {
      status: 404,
      error: "The requested invitation was not found.",
    };
  }

  if (code.includes("conflict") || message.includes("already responded")) {
    return {
      status: 409,
      error: "This invitation has already been responded to.",
    };
  }

  return {
    status: getSafeStatus(error),
    error: "Unable to process invitations.",
  };
}

async function requireWorkerUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw normalizeError(authError, "worker_invitations_auth_failed");
  }

  if (!user) {
    throw createRouteError(
      "Not authenticated.",
      "worker_invitations_not_authenticated",
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
      "worker_invitations_profile_failed"
    );
  }

  if (!profileResult.data || profileResult.data.role !== "worker") {
    throw createRouteError(
      "Access denied.",
      "worker_invitations_forbidden",
      403
    );
  }

  return { supabase, user };
}

export async function GET() {
  try {
    const result = await withServerErrorLogging(
      async () => {
        const { supabase, user } = await requireWorkerUser();

        const invitationsResult = await supabase
          .from("worker_invitations")
          .select(
            "id, contractor_company_id, worker_id, team_id, vacancy_id, message, status, invited_at, responded_at"
          )
          .eq("worker_id", user.id)
          .order("invited_at", { ascending: false });

        if (invitationsResult.error) {
          throw normalizeError(
            invitationsResult.error,
            "worker_invitations_load_failed"
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

        const directCompanyIds = invitations
          .map((item) => item.contractor_company_id)
          .filter((value): value is string => Boolean(value));

        let vacanciesById = new Map<string, VacancyRow>();

        if (vacancyIds.length > 0) {
          const vacanciesResult = await supabase
            .from("contractor_vacancies")
            .select("id, contractor_company_id, title, target_role")
            .in("id", vacancyIds);

          if (vacanciesResult.error) {
            throw normalizeError(
              vacanciesResult.error,
              "worker_invitations_vacancies_failed"
            );
          }

          vacanciesById = new Map(
            toVacancyRows(vacanciesResult.data).map((vacancy) => [
              vacancy.id,
              vacancy,
            ])
          );
        }

        const companyIds = Array.from(
          new Set([
            ...directCompanyIds,
            ...Array.from(vacanciesById.values())
              .map((vacancy) => vacancy.contractor_company_id)
              .filter((value): value is string => Boolean(value)),
          ])
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
              "worker_invitations_companies_failed"
            );
          }

          companiesById = new Map(
            toCompanyRows(companiesResult.data).map((company) => [
              company.id,
              company,
            ])
          );
        }

        const responseItems: InvitationResponseItem[] = invitations.map(
          (invitation) => {
            const vacancy = invitation.vacancy_id
              ? vacanciesById.get(invitation.vacancy_id) ?? null
              : null;

            const companyId =
              invitation.contractor_company_id ??
              vacancy?.contractor_company_id ??
              null;

            const company = companyId
              ? companiesById.get(companyId) ?? null
              : null;

            return {
              id: invitation.id,
              status: invitation.status,
              message: invitation.message,
              invited_at: invitation.invited_at,
              responded_at: invitation.responded_at,
              contractor_company_id: invitation.contractor_company_id,
              vacancy_id: invitation.vacancy_id,
              team_id: invitation.team_id,
              company_name:
                company?.dba_name?.trim() ||
                company?.legal_name?.trim() ||
                null,
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
        message: "worker_invitations_get_route_failed",
        code: "worker_invitations_get_route_failed",
        source: "api",
        area: "worker_invitations",
        path: "/api/worker/invitations",
        role: "worker",
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
        const { supabase, user } = await requireWorkerUser();

        const body = (await request.json().catch(() => null)) as unknown;

        if (!isRecord(body)) {
          throw createRouteError(
            "Invalid request body.",
            "worker_invitations_validation_failed",
            400
          );
        }

        const invitationId =
          typeof body.invitationId === "string" ? body.invitationId.trim() : "";
        const nextStatus =
          typeof body.status === "string"
            ? body.status.trim().toLowerCase()
            : "";

        if (!invitationId) {
          throw createRouteError(
            "Invitation ID is required.",
            "worker_invitations_validation_failed",
            400,
            { field: "invitationId" }
          );
        }

        if (nextStatus !== "accepted" && nextStatus !== "declined") {
          throw createRouteError(
            "Invalid invitation status.",
            "worker_invitations_validation_failed",
            400,
            { field: "status" }
          );
        }

        const invitationResult = await supabase
          .from("worker_invitations")
          .select("id, worker_id, status")
          .eq("id", invitationId)
          .maybeSingle();

        if (invitationResult.error) {
          throw normalizeError(
            invitationResult.error,
            "worker_invitations_lookup_failed"
          );
        }

        if (!invitationResult.data) {
          throw createRouteError(
            "Invitation not found.",
            "worker_invitations_not_found",
            404
          );
        }

        if (invitationResult.data.worker_id !== user.id) {
          throw createRouteError(
            "Access denied.",
            "worker_invitations_forbidden",
            403
          );
        }

        if (
          String(invitationResult.data.status || "").toLowerCase() !== "pending"
        ) {
          throw createRouteError(
            "Invitation already responded to.",
            "worker_invitations_already_responded",
            409
          );
        }

        const updateResult = await supabase
          .from("worker_invitations")
          .update({
            status: nextStatus,
            responded_at: new Date().toISOString(),
          })
          .eq("id", invitationId)
          .eq("worker_id", user.id)
          .select(
            "id, contractor_company_id, worker_id, team_id, vacancy_id, message, status, invited_at, responded_at"
          )
          .single();

        if (updateResult.error) {
          throw normalizeError(
            updateResult.error,
            "worker_invitations_update_failed"
          );
        }

        const invitation = toInvitationRow(updateResult.data);

        if (!invitation) {
          throw createRouteError(
            "Invalid invitation response shape.",
            "worker_invitations_response_invalid",
            500
          );
        }

        return {
          invitation,
        };
      },
      {
        message: "worker_invitations_patch_route_failed",
        code: "worker_invitations_patch_route_failed",
        source: "api",
        area: "worker_invitations",
        path: "/api/worker/invitations",
        role: "worker",
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    const safe = getSafeMessage(error);

    return NextResponse.json({ error: safe.error }, { status: safe.status });
  }
}