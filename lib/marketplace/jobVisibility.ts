export type JobVisibilityStatus =
  | "draft"
  | "internal"
  | "public"
  | "restricted"
  | "awarded"
  | "archived";

export type PublicJobVisibilityFields = {
  visibility_status: JobVisibilityStatus;
  public_slug: string | null;
  public_description: string | null;
  is_public: boolean;
  public_ready_at: string | null;
};

export type JobVisibilityInput = {
  id?: string | null;
  title?: string | null;
  location?: string | null;
  description?: string | null;
  status?: string | null;
  visibility_status?: string | null;
  visibility_mode?: string | null;
  public_slug?: string | null;
  public_description?: string | null;
  is_public?: boolean | null;
  public_ready_at?: string | null;
};

export type PublicReadinessIssue =
  | "missing_title"
  | "missing_market"
  | "missing_scope"
  | "missing_public_description"
  | "sensitive_contact_info"
  | "status_not_public_allowed"
  | "visibility_not_public";

export type PublicReadinessResult = {
  ready: boolean;
  issues: PublicReadinessIssue[];
  safePublicDescription: string | null;
};

export const JOB_VISIBILITY_STATUSES: JobVisibilityStatus[] = [
  "draft",
  "internal",
  "public",
  "restricted",
  "awarded",
  "archived",
];

const publicAllowedStatuses = new Set(["open", "active", "published"]);
const sensitiveContactPattern =
  /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})|(\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/i;

export function normalizeJobVisibilityStatus(
  value?: string | null
): JobVisibilityStatus {
  if (JOB_VISIBILITY_STATUSES.includes(value as JobVisibilityStatus)) {
    return value as JobVisibilityStatus;
  }

  return "internal";
}

export function createPublicJobSlug(title: string, id?: string | null) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  const suffix = id ? `-${id.slice(0, 8)}` : "";
  return `${slug || "telecom-job"}${suffix}`;
}

export function hasSensitiveContactInfo(value?: string | null) {
  return sensitiveContactPattern.test(value ?? "");
}

export function evaluatePublicReadiness(
  job: JobVisibilityInput & { scope?: string | null; scopes?: string[] | null }
): PublicReadinessResult {
  const issues: PublicReadinessIssue[] = [];
  const publicDescription = job.public_description ?? job.description ?? null;
  const status = (job.status ?? "open").toLowerCase();
  const visibilityStatus = normalizeJobVisibilityStatus(job.visibility_status);
  const hasLegacyPublicMode = job.visibility_mode === "public" || job.is_public === true;
  const hasScope = Boolean(job.scope?.trim()) || Boolean(job.scopes?.length);

  if (!job.title?.trim()) issues.push("missing_title");
  if (!job.location?.trim()) issues.push("missing_market");
  if (!hasScope) issues.push("missing_scope");
  if (!publicDescription?.trim()) issues.push("missing_public_description");
  if (hasSensitiveContactInfo(publicDescription)) {
    issues.push("sensitive_contact_info");
  }
  if (!publicAllowedStatuses.has(status)) {
    issues.push("status_not_public_allowed");
  }
  if (visibilityStatus !== "public" && !hasLegacyPublicMode) {
    issues.push("visibility_not_public");
  }

  return {
    ready: issues.length === 0,
    issues,
    safePublicDescription:
      publicDescription && !hasSensitiveContactInfo(publicDescription)
        ? publicDescription
        : null,
  };
}

export function deriveJobVisibility(job: JobVisibilityInput): PublicJobVisibilityFields {
  const explicitStatus = normalizeJobVisibilityStatus(job.visibility_status);
  const legacyPublic = job.visibility_mode === "public" || job.is_public === true;
  const publicDescription = job.public_description ?? job.description ?? null;
  const canUsePublicStatus =
    explicitStatus === "public" || (explicitStatus === "internal" && legacyPublic);
  const readiness = evaluatePublicReadiness({
    ...job,
    visibility_status: canUsePublicStatus ? "public" : explicitStatus,
    scope: job.description,
  });

  const isPublic = canUsePublicStatus && readiness.ready;

  return {
    visibility_status: isPublic ? "public" : explicitStatus,
    public_slug:
      job.public_slug ?? (job.title ? createPublicJobSlug(job.title, job.id) : null),
    public_description: readiness.safePublicDescription ?? publicDescription,
    is_public: isPublic,
    public_ready_at:
      isPublic && !job.public_ready_at
        ? new Date().toISOString()
        : job.public_ready_at ?? null,
  };
}

export function isPublicReadyJob(job: JobVisibilityInput) {
  return deriveJobVisibility(job).is_public;
}
