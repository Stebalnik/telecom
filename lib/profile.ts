import { normalizeError } from "./errors/normalizeError";
import {
  unwrapSupabase,
  unwrapSupabaseNullable,
} from "./errors/unwrapSupabase";
import { supabase } from "./supabaseClient";

export type UserRole = "customer" | "contractor" | "admin";

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
  details?: Record<string, unknown>
): AppError {
  const error = new Error(message) as AppError;
  error.code = code;
  error.details = details;
  return error;
}

function normalizeProfileError(
  error: unknown,
  context: string,
  fallbackMessage: string
): AppError {
  const normalized = normalizeError(error) as AppError;

  const rawMessage = normalized.message || fallbackMessage;
  const rawCode = String(normalized.code || "").toLowerCase();
  const message = String(rawMessage).toLowerCase();

  if (
    rawCode === "23505" ||
    message.includes("duplicate key") ||
    message.includes("profiles_pkey")
  ) {
    return createAppError("Profile already exists.", `${context}_duplicate`, {
      rawMessage,
      originalCode: normalized.code ?? null,
      statusCode: normalized.statusCode ?? null,
      ...(normalized.details ?? {}),
    });
  }

  return createAppError(rawMessage, `${context}_failed`, {
    rawMessage,
    originalCode: normalized.code ?? null,
    statusCode: normalized.statusCode ?? null,
    ...(normalized.details ?? {}),
  });
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
    const data = unwrapSupabaseNullable(
      await supabase
        .from("profiles")
        .select("id, role, created_at")
        .eq("id", sessionData.session.user.id)
        .maybeSingle(),
      "get_profile_failed"
    );

    return data as Profile | null;
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
    throw createAppError("Not logged in.", "create_profile_not_logged_in");
  }

  const userId = sessionData.session.user.id;

  try {
    unwrapSupabase(
      await supabase.from("profiles").upsert(
        {
          id: userId,
          role,
        },
        {
          onConflict: "id",
        }
      ),
      "create_profile_failed"
    );
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