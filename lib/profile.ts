import { normalizeError } from "./errors/normalizeError";
import { unwrapSupabaseNullable } from "./errors/unwrapSupabase";
import { supabase } from "./supabaseClient";

export type UserRole =
  | "customer"
  | "contractor"
  | "admin"
  | "specialist";

export type Profile = {
  id: string;
  role: UserRole | null;
  created_at: string;
};

type AppError = Error & {
  code?: string;
  details?: Record<string, unknown>;
  statusCode?: number;
};

function createAppError(
  message: string,
  code: string,
  details?: Record<string, unknown>,
  statusCode?: number
): AppError {
  const error = new Error(message) as AppError;
  error.code = code;
  error.details = details;
  error.statusCode = statusCode;
  return error;
}

function normalizeProfileError(
  error: unknown,
  context: string,
  fallbackMessage: string
): AppError {
  const normalized = normalizeError(error) as AppError;

  const rawCode = String(normalized.code ?? "").toLowerCase();
  const rawMessage = String(normalized.message ?? "").toLowerCase();

  if (
    rawCode === "23505" ||
    rawMessage.includes("duplicate key") ||
    rawMessage.includes("profiles_pkey")
  ) {
    return createAppError(
      "Profile already exists.",
      `${context}_duplicate`,
      {
        originalCode: normalized.code ?? null,
      },
      normalized.statusCode
    );
  }

  return createAppError(
    fallbackMessage,
    `${context}_failed`,
    {
      originalCode: normalized.code ?? null,
    },
    normalized.statusCode
  );
}

export async function getMyProfile(): Promise<Profile | null> {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    throw normalizeProfileError(
      sessionError,
      "get_profile_session",
      "Unable to get current session."
    );
  }

  if (!sessionData.session?.user) {
    return null;
  }

  try {
    return unwrapSupabaseNullable(
      await supabase
        .from("profiles")
        .select("id, role, created_at")
        .eq("id", sessionData.session.user.id)
        .maybeSingle(),
      "get_profile_failed"
    ) as Profile | null;
  } catch (error) {
    throw normalizeProfileError(
      error,
      "get_profile",
      "Unable to load profile."
    );
  }
}

export async function createMyProfile(
  role: UserRole
): Promise<{ id: string; role: UserRole }> {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    throw normalizeProfileError(
      sessionError,
      "create_profile_session",
      "Unable to get current session."
    );
  }

  if (!sessionData.session?.user) {
    throw createAppError(
      "Not logged in.",
      "create_profile_not_logged_in",
      undefined,
      401
    );
  }

  const userId = sessionData.session.user.id;

  try {
    const result = await supabase.from("profiles").upsert(
      {
        id: userId,
        role,
      },
      {
        onConflict: "id",
      }
    );

    if (result.error) {
      throw normalizeError(result.error, "create_profile_failed");
    }
  } catch (error) {
    throw normalizeProfileError(
      error,
      "create_profile",
      "Unable to create profile."
    );
  }

  return {
    id: userId,
    role,
  };
}