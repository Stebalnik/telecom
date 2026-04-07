import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeError } from "@/lib/errors/normalizeError";
import { unwrapSupabase, unwrapSupabaseNullable } from "@/lib/errors/unwrapSupabase";
import { withServerErrorLogging } from "@/lib/errors/withServerErrorLogging";

type AppError = Error & {
  code?: string;
  details?: Record<string, unknown>;
  statusCode?: number;
};

type UserRole = "admin" | "contractor" | "customer" | "unknown";

type ProfileRow = {
  role: UserRole | null;
};

type ContractorCoiRow = {
  id: string;
  company_id: string;
  file_path: string;
};

type IdRow = {
  id: string;
};

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function createAppError(
  message: string,
  code: string,
  statusCode: number,
  details?: Record<string, unknown>
): AppError {
  const error = new Error(message) as AppError;
  error.code = code;
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function getBearerToken(req: Request) {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function toSafeResponse(error: unknown) {
  const normalized = normalizeError(error) as AppError;
  const statusCode = normalized.statusCode ?? 500;
  const code = String(normalized.code || "");

  if (statusCode === 400) {
    return NextResponse.json(
      { error: normalized.message || "Invalid request." },
      { status: 400 }
    );
  }

  if (statusCode === 401) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  if (statusCode === 403) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (statusCode === 404 || code.includes("not_found")) {
    return NextResponse.json({ error: "COI not found." }, { status: 404 });
  }

  return NextResponse.json(
    { error: "Unable to generate COI download link." },
    { status: 500 }
  );
}

export async function GET(req: Request) {
  try {
    const result = await withServerErrorLogging(
      async () => {
        const { searchParams } = new URL(req.url);
        const coiId = searchParams.get("coiId");

        if (!coiId) {
          throw createAppError("Missing coiId.", "coi_download_missing_coi_id", 400);
        }

        const token = getBearerToken(req);

        if (!token) {
          throw createAppError(
            "Missing Authorization Bearer token.",
            "coi_download_missing_token",
            401
          );
        }

        const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);

        if (userErr || !userData?.user) {
          throw createAppError("Invalid session.", "coi_download_invalid_session", 401);
        }

        const userId = userData.user.id;

        const profile = unwrapSupabaseNullable<ProfileRow>(
          await supabaseAdmin
            .from("profiles")
            .select("role")
            .eq("id", userId)
            .maybeSingle(),
          "coi_download_get_profile_failed",
          "Unable to load profile."
        );

        const role: UserRole = profile?.role ?? "unknown";

        let coi: ContractorCoiRow;
        try {
          coi = unwrapSupabase<ContractorCoiRow>(
            await supabaseAdmin
              .from("contractor_coi")
              .select("id, company_id, file_path")
              .eq("id", coiId)
              .single(),
            "coi_download_get_coi_failed",
            "COI not found."
          );
        } catch (error) {
          const normalized = normalizeError(error) as AppError;
          throw createAppError(
            "COI not found.",
            normalized.code || "coi_download_coi_not_found",
            404,
            normalized.details
          );
        }

        let allowed = false;

        if (role === "admin") {
          allowed = true;
        } else if (role === "contractor") {
          const company = unwrapSupabaseNullable<IdRow>(
            await supabaseAdmin
              .from("contractor_companies")
              .select("id")
              .eq("id", coi.company_id)
              .eq("owner_user_id", userId)
              .maybeSingle(),
            "coi_download_get_contractor_company_failed",
            "Unable to verify contractor access."
          );

          if (company?.id) {
            allowed = true;
          }
        } else if (role === "customer") {
          const customer = unwrapSupabaseNullable<IdRow>(
            await supabaseAdmin
              .from("customers")
              .select("id")
              .eq("owner_user_id", userId)
              .maybeSingle(),
            "coi_download_get_customer_failed",
            "Unable to verify customer access."
          );

          if (customer?.id) {
            const link = unwrapSupabaseNullable<IdRow>(
              await supabaseAdmin
                .from("customer_contractors")
                .select("id")
                .eq("customer_id", customer.id)
                .eq("contractor_company_id", coi.company_id)
                .eq("status", "approved")
                .maybeSingle(),
              "coi_download_get_customer_contractor_link_failed",
              "Unable to verify customer contractor access."
            );

            if (link?.id) {
              allowed = true;
            }
          }
        }

        if (!allowed) {
          throw createAppError("Forbidden.", "coi_download_forbidden", 403, {
            userId,
            role,
            coiId,
            companyId: coi.company_id,
          });
        }

        const { data: signed, error: signErr } = await supabaseAdmin.storage
          .from("coi-files")
          .createSignedUrl(coi.file_path, 60 * 10);

        if (signErr || !signed?.signedUrl) {
          throw normalizeError(
            signErr || new Error("Signed URL was not returned."),
            "coi_download_create_signed_url_failed",
            "Unable to create signed URL."
          );
        }

        return { url: signed.signedUrl };
      },
      {
        message: "coi_download_failed",
        code: "coi_download_failed",
        source: "api",
        area: "documents",
        path: "/api/coi/signed-url",
        level: "error",
        details: {
          method: "GET",
        },
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    return toSafeResponse(error);
  }
}