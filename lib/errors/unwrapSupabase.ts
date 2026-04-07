import { normalizeError } from "@/lib/errors/normalizeError";

type SupabaseResult<T> = {
  data: T | null;
  error: unknown;
};

export function unwrapSupabase<T>(
  result: SupabaseResult<T>,
  fallbackCode: string,
  fallbackMessage = "Supabase operation failed"
): T {
  if (result.error) {
    throw normalizeError(result.error, fallbackCode, fallbackMessage);
  }

  if (result.data === null) {
    throw normalizeError(
      new Error(fallbackMessage),
      fallbackCode,
      fallbackMessage
    );
  }

  return result.data;
}

export function unwrapSupabaseNullable<T>(
  result: SupabaseResult<T>,
  fallbackCode: string,
  fallbackMessage = "Supabase operation failed"
): T | null {
  if (result.error) {
    throw normalizeError(result.error, fallbackCode, fallbackMessage);
  }

  return result.data;
}