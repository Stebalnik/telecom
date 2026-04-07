import { supabase } from "./supabaseClient";

type AppError = Error & {
  code?: string;
  details?: Record<string, unknown>;
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

export async function getMySessionUser() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw createAppError("Unable to get current session.", "auth_get_session_failed", {
      rawMessage: error.message,
    });
  }

  return data.session?.user ?? null;
}

export async function getMyUserId(): Promise<string> {
  const user = await getMySessionUser();

  if (!user) {
    throw createAppError("Not logged in", "auth_not_logged_in");
  }

  return user.id;
}