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

export function deriveJobVisibility(job: JobVisibilityInput): PublicJobVisibilityFields {
  const explicitStatus = normalizeJobVisibilityStatus(job.visibility_status);
  const legacyPublic = job.visibility_mode === "public" || job.is_public === true;
  const publicDescription = job.public_description ?? job.description ?? null;
  const canUsePublicStatus =
    explicitStatus === "public" || (explicitStatus === "internal" && legacyPublic);

  const isPublic =
    canUsePublicStatus &&
    Boolean(job.title?.trim()) &&
    Boolean(job.location?.trim()) &&
    Boolean(publicDescription?.trim()) &&
    publicAllowedStatuses.has((job.status ?? "open").toLowerCase()) &&
    !hasSensitiveContactInfo(publicDescription);

  return {
    visibility_status: isPublic ? "public" : explicitStatus,
    public_slug:
      job.public_slug ?? (job.title ? createPublicJobSlug(job.title, job.id) : null),
    public_description: publicDescription,
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
