import { supabase } from "./supabaseClient";

export type UserRole = "customer" | "contractor" | "admin";

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

function normalizeProfileError(error: any, context: string): AppError {
  const rawMessage =
    error?.message ||
    error?.error_description ||
    error?.details ||
    "Unknown profile error";

  const code = String(error?.code || "").toLowerCase();
  const message = String(rawMessage).toLowerCase();

  if (
    code === "23505" ||
    message.includes("duplicate key") ||
    message.includes("profiles_pkey")
  ) {
    return createAppError(
      "Profile already exists.",
      `${context}_duplicate`,
      {
        rawMessage,
        dbCode: error?.code ?? null,
      }
    );
  }

  return createAppError(
    rawMessage,
    `${context}_failed`,
    {
      rawMessage,
      dbCode: error?.code ?? null,
      hint: error?.hint ?? null,
      details: error?.details ?? null,
    }
  );
}

export async function getMyProfile() {
  const { data: userData, error: userErr } = await supabase.auth.getSession();

  if (userErr) {
    throw createAppError("Unable to get current session.", "get_profile_session_failed", {
      rawMessage: userErr.message,
    });
  }

  if (!userData.session?.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, created_at")
    .eq("id", userData.session.user.id)
    .maybeSingle();

  if (error) {
    throw normalizeProfileError(error, "get_profile");
  }

  return data;
}

export async function createMyProfile(role: UserRole) {
  const { data: userData, error: userErr } = await supabase.auth.getSession();

  if (userErr) {
    throw createAppError("Unable to get current session.", "create_profile_session_failed", {
      rawMessage: userErr.message,
    });
  }

  if (!userData.session?.user) {
    throw createAppError("Not logged in", "create_profile_not_logged_in");
  }

  const userId = userData.session.user.id;

  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      role,
    },
    {
      onConflict: "id",
    }
  );

  if (error) {
    throw normalizeProfileError(error, "create_profile");
  }

  return {
    id: userId,
    role,
  };
}