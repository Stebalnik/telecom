import { createClient } from "@/lib/supabase/server";

export type AnalyticsRange = "1d" | "7d" | "30d" | "all";

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

export async function getAdminAnalyticsSummary(
  range: AnalyticsRange = "7d"
): Promise<AnalyticsSummary> {
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

  const rows = (data ?? []) as AnalyticsEventRow[];

  const count = (eventName: string) =>
    rows.filter((row) => row.event === eventName).length;

  const loginCount = count("login");
  const signupCount = count("signup");
  const contractorOnboardingStarted = count("contractor_onboarding_started");
  const contractorOnboardingSubmitted = count("contractor_onboarding_submitted");
  const customerCreateJobSubmitted = count("customer_create_job_submitted");
  const submitBidCount = count("submit_bid");
  const openMissionPageCount = count("open_mission_page");
  const startDonationCheckoutCount = count("start_donation_checkout");

  const byDayMap = new Map<string, number>();
  for (const row of rows) {
    const day = new Date(row.created_at).toISOString().slice(0, 10);
    byDayMap.set(day, (byDayMap.get(day) ?? 0) + 1);
  }

  const byDay = Array.from(byDayMap.entries())
    .map(([day, total]) => ({ day, total }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const eventMap = new Map<string, number>();
  for (const row of rows) {
    eventMap.set(row.event, (eventMap.get(row.event) ?? 0) + 1);
  }

  const topEvents = Array.from(eventMap.entries())
    .map(([event, total]) => ({ event, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  const roleMap = new Map<string, number>();
  for (const row of rows) {
    const role = row.role || "unknown";
    roleMap.set(role, (roleMap.get(role) ?? 0) + 1);
  }

  const roleBreakdown = Array.from(roleMap.entries())
    .map(([role, total]) => ({ role, total }))
    .sort((a, b) => b.total - a.total);

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
    byDay,
    topEvents,
    roleBreakdown,
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