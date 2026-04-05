import { createClient } from "@/lib/supabase/server";

export type AnalyticsRange = "1d" | "7d" | "30d" | "all";
export type AnalyticsSegment =
  | "general"
  | "customers"
  | "contractors"
  | "admin_actions";

export type AnalyticsEventRow = {
  event: string;
  created_at: string;
  role: string | null;
  path: string | null;
  meta: Record<string, unknown> | null;
};

export type AnalyticsSummary = {
  range: AnalyticsRange;
  totalEvents: number;
  loginCount: number;
  signupCount: number;
  contractorOnboardingStarted: number;
  contractorOnboardingSubmitted: number;
  customerCreateJobSubmitted: number;
  submitBidCount: number;
  openMissionPageCount: number;
  startDonationCheckoutCount: number;
  byDay: Array<{
    day: string;
    total: number;
  }>;
  topEvents: Array<{
    event: string;
    total: number;
  }>;
  roleBreakdown: Array<{
    role: string;
    total: number;
  }>;
  conversions: {
    onboardingSubmitRate: number;
    missionCheckoutRate: number;
  };
};

export type AnalyticsBreakdown = {
  range: AnalyticsRange;
  segment: AnalyticsSegment;
  totalEvents: number;
  byDay: Array<{
    day: string;
    total: number;
  }>;
  topEvents: Array<{
    event: string;
    total: number;
  }>;
  roleBreakdown: Array<{
    role: string;
    total: number;
  }>;
  events: Record<string, number>;
  conversions: Record<string, number>;
};

function getSinceDate(range: AnalyticsRange): Date | null {
  if (range === "all") return null;

  const now = new Date();

  if (range === "1d") {
    now.setDate(now.getDate() - 1);
    return now;
  }

  if (range === "7d") {
    now.setDate(now.getDate() - 7);
    return now;
  }

  now.setDate(now.getDate() - 30);
  return now;
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function countEvent(rows: AnalyticsEventRow[], eventName: string) {
  return rows.filter((row) => row.event === eventName).length;
}

function buildByDay(rows: AnalyticsEventRow[]) {
  const byDayMap = new Map<string, number>();

  for (const row of rows) {
    const day = new Date(row.created_at).toISOString().slice(0, 10);
    byDayMap.set(day, (byDayMap.get(day) ?? 0) + 1);
  }

  return Array.from(byDayMap.entries())
    .map(([day, total]) => ({ day, total }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

function buildTopEvents(rows: AnalyticsEventRow[], limit = 12) {
  const eventMap = new Map<string, number>();

  for (const row of rows) {
    eventMap.set(row.event, (eventMap.get(row.event) ?? 0) + 1);
  }

  return Array.from(eventMap.entries())
    .map(([event, total]) => ({ event, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

function buildRoleBreakdown(rows: AnalyticsEventRow[]) {
  const roleMap = new Map<string, number>();

  for (const row of rows) {
    const role = row.role || "unknown";
    roleMap.set(role, (roleMap.get(role) ?? 0) + 1);
  }

  return Array.from(roleMap.entries())
    .map(([role, total]) => ({ role, total }))
    .sort((a, b) => b.total - a.total);
}

function filterRowsBySegment(
  rows: AnalyticsEventRow[],
  segment: AnalyticsSegment
): AnalyticsEventRow[] {
  if (segment === "general") {
    return rows;
  }

  if (segment === "customers") {
    return rows.filter(
      (row) =>
        row.role === "customer" ||
        row.event.startsWith("customer_")
    );
  }

  if (segment === "contractors") {
    return rows.filter(
      (row) =>
        row.role === "contractor" ||
        row.event.startsWith("contractor_") ||
        row.event === "submit_bid" ||
        row.event === "customer_approval_requested" ||
        row.event === "job_opened"
    );
  }

  return rows.filter(
    (row) =>
      row.role === "admin" ||
      row.event.startsWith("admin_")
  );
}

async function getAnalyticsRows(range: AnalyticsRange): Promise<AnalyticsEventRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("analytics_events")
    .select("event, created_at, role, path, meta")
    .order("created_at", { ascending: false });

  const since = getSinceDate(range);

  if (since) {
    query = query.gte("created_at", since.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AnalyticsEventRow[];
}

export async function getAdminAnalyticsSummary(
  range: AnalyticsRange = "7d"
): Promise<AnalyticsSummary> {
  const rows = await getAnalyticsRows(range);

  const loginCount = countEvent(rows, "login");
  const signupCount = countEvent(rows, "signup");
  const contractorOnboardingStarted = countEvent(
    rows,
    "contractor_onboarding_started"
  );
  const contractorOnboardingSubmitted = countEvent(
    rows,
    "contractor_onboarding_submitted"
  );
  const customerCreateJobSubmitted = countEvent(
    rows,
    "customer_create_job_submitted"
  );
  const submitBidCount = countEvent(rows, "submit_bid");
  const openMissionPageCount = countEvent(rows, "open_mission_page");
  const startDonationCheckoutCount = countEvent(
    rows,
    "start_donation_checkout"
  );

  return {
    range,
    totalEvents: rows.length,
    loginCount,
    signupCount,
    contractorOnboardingStarted,
    contractorOnboardingSubmitted,
    customerCreateJobSubmitted,
    submitBidCount,
    openMissionPageCount,
    startDonationCheckoutCount,
    byDay: buildByDay(rows),
    topEvents: buildTopEvents(rows),
    roleBreakdown: buildRoleBreakdown(rows),
    conversions: {
      onboardingSubmitRate: percent(
        contractorOnboardingSubmitted,
        contractorOnboardingStarted
      ),
      missionCheckoutRate: percent(
        startDonationCheckoutCount,
        openMissionPageCount
      ),
    },
  };
}

export async function getAdminAnalyticsBreakdown(
  segment: AnalyticsSegment,
  range: AnalyticsRange = "7d"
): Promise<AnalyticsBreakdown> {
  const rows = await getAnalyticsRows(range);
  const filteredRows = filterRowsBySegment(rows, segment);

  const events: Record<string, number> = {};
  for (const row of filteredRows) {
    events[row.event] = (events[row.event] ?? 0) + 1;
  }

  let conversions: Record<string, number> = {};

  if (segment === "customers") {
    const customerSignups = countEvent(filteredRows, "signup");
    const customerJobsCreated = countEvent(
      filteredRows,
      "customer_create_job_submitted"
    );

    conversions = {
      customerJobCreationRate: percent(customerJobsCreated, customerSignups),
    };
  } else if (segment === "contractors") {
    const onboardingStarted = countEvent(
      filteredRows,
      "contractor_onboarding_started"
    );
    const onboardingSubmitted = countEvent(
      filteredRows,
      "contractor_onboarding_submitted"
    );
    const bidsSubmitted = countEvent(filteredRows, "submit_bid");

    conversions = {
      onboardingSubmitRate: percent(onboardingSubmitted, onboardingStarted),
      bidSubmitRateFromOnboarding: percent(bidsSubmitted, onboardingSubmitted),
    };
  } else if (segment === "admin_actions") {
    const approved = countEvent(filteredRows, "admin_contractor_approved");
    const returnedToDraft = countEvent(
      filteredRows,
      "admin_contractor_returned_to_draft"
    );

    conversions = {
      approvalVsReturnRate: percent(approved, approved + returnedToDraft),
    };
  } else {
    const missionOpens = countEvent(filteredRows, "open_mission_page");
    const donationStarts = countEvent(filteredRows, "start_donation_checkout");

    conversions = {
      missionCheckoutRate: percent(donationStarts, missionOpens),
    };
  }

  return {
    range,
    segment,
    totalEvents: filteredRows.length,
    byDay: buildByDay(filteredRows),
    topEvents: buildTopEvents(filteredRows),
    roleBreakdown: buildRoleBreakdown(filteredRows),
    events,
    conversions,
  };
}