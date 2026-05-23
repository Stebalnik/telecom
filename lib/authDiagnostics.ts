type DiagnosticLikeError = Error & {
  code?: unknown;
  status?: unknown;
  statusCode?: unknown;
  cause?: unknown;
};

function safeString(value: unknown, fallback = "unknown") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 300) : fallback;
}

export function getSanitizedAuthErrorDetails(error: unknown) {
  const candidate = error as Partial<DiagnosticLikeError>;
  const cause = candidate?.cause as Partial<DiagnosticLikeError> | undefined;

  return {
    name: safeString(candidate?.name, "Error"),
    message: safeString(candidate?.message, "Auth request failed."),
    code:
      typeof candidate?.code === "string"
        ? safeString(candidate.code)
        : typeof cause?.code === "string"
        ? safeString(cause.code)
        : null,
    status:
      typeof candidate?.status === "number"
        ? candidate.status
        : typeof candidate?.statusCode === "number"
        ? candidate.statusCode
        : null,
    cause: cause?.message ? safeString(cause.message) : null,
  };
}

export function isAuthNetworkError(error: unknown) {
  const details = getSanitizedAuthErrorDetails(error);
  const message = `${details.message} ${details.code ?? ""} ${details.cause ?? ""}`.toLowerCase();

  return (
    message.includes("fetch failed") ||
    message.includes("enotfound") ||
    message.includes("networkerror") ||
    message.includes("failed to fetch")
  );
}
