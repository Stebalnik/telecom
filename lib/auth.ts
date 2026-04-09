import { normalizeError } from "./errors/normalizeError";
import { supabase } from "./supabaseClient";

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

function normalizeAuthError(
  error: unknown,
  code: string,
  fallbackMessage: string
): AppError {
  const normalized = normalizeError(error) as AppError;

  return createAppError(
    fallbackMessage,
    code,
    {
      originalCode: normalized.code ?? null,
    },
    normalized.statusCode
  );
}

export async function getMySessionUser() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw normalizeError(error, "auth_get_session_failed");
    }

    return data.session?.user ?? null;
  } catch (error) {
    throw normalizeAuthError(
      error,
      "auth_get_session_failed",
      "Unable to get current session."
    );
  }
}

export async function getMyUserId(): Promise<string> {
  const user = await getMySessionUser();

  if (!user) {
    throw createAppError("Not logged in.", "auth_not_logged_in", undefined, 401);
  }

  return user.id;
}