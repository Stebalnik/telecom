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
  details?: Record<string, unknown>
): AppError {
  const error = new Error(message) as AppError;
  error.code = code;
  error.details = details;
  return error;
}

function normalizeAuthError(
  error: unknown,
  code: string,
  fallbackMessage: string
): AppError {
  const normalized = normalizeError(error) as AppError;

  return createAppError(normalized.message || fallbackMessage, code, {
    originalCode: normalized.code ?? null,
    statusCode: normalized.statusCode ?? null,
    ...(normalized.details ?? {}),
  });
}

export async function getMySessionUser() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw normalizeAuthError(
      error,
      "auth_get_session_failed",
      "Unable to get current session."
    );
  }

  return data.session?.user ?? null;
}

export async function getMyUserId(): Promise<string> {
  const user = await getMySessionUser();

  if (!user) {
    throw createAppError("Not logged in.", "auth_not_logged_in");
  }

  return user.id;
}