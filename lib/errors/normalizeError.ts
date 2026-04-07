export type AppError = Error & {
  code?: string;
  details?: Record<string, unknown>;
  statusCode?: number;
};

export function createAppError(
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

function safeMessage(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

export function normalizeError(
  error: unknown,
  fallbackCode = "unknown_error",
  fallbackMessage = "Unexpected error"
): AppError {
  if (!error) {
    return createAppError(fallbackMessage, fallbackCode);
  }

  const candidate = error as Partial<AppError> & {
    error_description?: unknown;
    hint?: unknown;
    details?: unknown;
    code?: unknown;
    status?: unknown;
    statusCode?: unknown;
  };

  if (error instanceof Error && typeof candidate.code === "string") {
    return error as AppError;
  }

  const rawMessage = safeMessage(
    typeof candidate.message === "string"
      ? candidate.message
      : typeof candidate.error_description === "string"
      ? candidate.error_description
      : typeof candidate.details === "string"
      ? candidate.details
      : fallbackMessage,
    fallbackMessage
  );

  const dbCode =
    typeof candidate.code === "string" ? candidate.code.toLowerCase() : "";
  const lowerMessage = rawMessage.toLowerCase();

  const details: Record<string, unknown> = {
    rawMessage,
    dbCode: typeof candidate.code === "string" ? candidate.code : null,
    hint: candidate.hint ?? null,
    details:
      candidate.details && typeof candidate.details !== "string"
        ? candidate.details
        : null,
  };

  const explicitStatus =
    typeof candidate.statusCode === "number"
      ? candidate.statusCode
      : typeof candidate.status === "number"
      ? candidate.status
      : undefined;

  if (
    dbCode === "23505" ||
    lowerMessage.includes("duplicate key") ||
    lowerMessage.includes("already exists")
  ) {
    return createAppError(
      "Duplicate record.",
      `${fallbackCode}_duplicate`,
      details,
      409
    );
  }

  if (
    dbCode === "42501" ||
    lowerMessage.includes("row-level security") ||
    lowerMessage.includes("permission denied") ||
    lowerMessage.includes("not allowed") ||
    lowerMessage.includes("forbidden")
  ) {
    return createAppError(
      "Permission denied.",
      `${fallbackCode}_forbidden`,
      details,
      403
    );
  }

  if (
    lowerMessage.includes("not logged in") ||
    lowerMessage.includes("jwt") ||
    lowerMessage.includes("session") ||
    lowerMessage.includes("unauthorized") ||
    lowerMessage.includes("auth session missing")
  ) {
    return createAppError(
      "Authentication required.",
      `${fallbackCode}_unauthorized`,
      details,
      401
    );
  }

  if (
    lowerMessage.includes("invalid input") ||
    lowerMessage.includes("validation") ||
    lowerMessage.includes("invalid request")
  ) {
    return createAppError(
      "Invalid request.",
      `${fallbackCode}_invalid`,
      details,
      400
    );
  }

  return createAppError(
    rawMessage || fallbackMessage,
    fallbackCode,
    details,
    explicitStatus
  );
}