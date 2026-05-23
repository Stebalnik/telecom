"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { getMyProfile } from "../../../lib/profile";

type AnalyticsRange = "1d" | "7d" | "30d" | "all";

type AnalyticsSummary = {
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

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-[#1F6FB5] text-white"
          : "border border-[#D9E2EC] bg-white text-[#111827] hover:bg-[#F8FAFC]"
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
      <div className="text-sm text-[#4B5563]">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-[#111827]">{value}</div>
      {hint ? <div className="mt-1 text-xs text-[#6B7280]">{hint}</div> : null}
    </div>
  );
}

function VisibilityMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[#D9E2EC] bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold text-[#0A2E5C]">{value}</div>
      <div className="mt-1 text-sm leading-6 text-[#4B5563]">{detail}</div>
    </div>
  );
}

function InsightCard({
  title,
  value,
  detail,
  tone = "default",
}: {
  title: string;
  value: string;
  detail: string;
  tone?: "default" | "good" | "warning";
}) {
  const toneClasses =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : "border-[#D9E2EC] bg-white";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClasses}`}>
      <div className="text-sm font-semibold text-[#111827]">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-[#0A2E5C]">{value}</div>
      <div className="mt-1 text-sm leading-6 text-[#4B5563]">{detail}</div>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  max,
  share,
}: {
  label: string;
  value: number;
  max: number;
  share?: number;
}) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;

  return (
    <div className="rounded-xl border border-[#D9E2EC] bg-[#FCFDFE] px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 text-sm font-medium text-[#111827] break-words">
          {label}
        </div>
        <div className="shrink-0 text-sm text-[#4B5563]">{value}</div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-[#E8F1FA]">
        <div
          className="h-2 rounded-full bg-[#1F6FB5]"
          style={{ width: `${width}%` }}
        />
      </div>
      {share !== undefined ? (
        <div className="mt-2 text-xs text-[#6B7280]">{share}% of selected range</div>
      ) : null}
    </div>
  );
}

function formatDay(day: string) {
  return new Date(day).toLocaleDateString();
}

function formatShare(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function getActivityTone(totalEvents: number): "default" | "good" | "warning" {
  if (totalEvents === 0) return "warning";
  if (totalEvents >= 25) return "good";
  return "default";
}

export default function AdminAnalyticsPage() {
  const router = useRouter();

  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  async function loadPage(selectedRange: AnalyticsRange) {
    setLoading(true);
    setErr(null);

    try {
      const { data } = await supabase.auth.getSession();

      if (!data.session?.user) {
        router.replace("/login");
        return;
      }

      const profile = await getMyProfile();

      if (!profile || profile.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      const res = await fetch(`/api/admin/analytics?range=${selectedRange}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load analytics.");
      }

      setSummary(json.summary);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const rangeLabel = useMemo(() => {
    if (range === "1d") return "Last 24 hours";
    if (range === "7d") return "Last 7 days";
    if (range === "30d") return "Last 30 days";
    return "All time";
  }, [range]);

  const visibility = useMemo(() => {
    if (!summary) return null;

    const peakDay = summary.byDay.reduce(
      (best, row) => (row.total > best.total ? row : best),
      { day: "", total: 0 }
    );
    const topEvent = summary.topEvents[0] ?? null;
    const maxDayTotal = Math.max(0, ...summary.byDay.map((row) => row.total));
    const maxEventTotal = Math.max(0, ...summary.topEvents.map((row) => row.total));
    const maxRoleTotal = Math.max(0, ...summary.roleBreakdown.map((row) => row.total));
    const activeRoleCount = summary.roleBreakdown.filter((row) => row.total > 0).length;

    return {
      activeRoleCount,
      maxDayTotal,
      maxEventTotal,
      maxRoleTotal,
      peakDay,
      topEvent,
      topEventShare: topEvent ? formatShare(topEvent.total, summary.totalEvents) : 0,
    };
  }, [summary]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827]">
              Analytics
            </h1>
            <p className="mt-2 text-sm text-[#4B5563]">
              Product activity and tracked event summary for the platform.
            </p>
            <div className="mt-2 text-xs text-[#6B7280]">{rangeLabel}</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin"
              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              Back to admin
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <FilterButton active={range === "1d"} onClick={() => setRange("1d")}>
            1 day
          </FilterButton>
          <FilterButton active={range === "7d"} onClick={() => setRange("7d")}>
            7 days
          </FilterButton>
          <FilterButton active={range === "30d"} onClick={() => setRange("30d")}>
            30 days
          </FilterButton>
          <FilterButton active={range === "all"} onClick={() => setRange("all")}>
            All time
          </FilterButton>
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading analytics...</p>
        </section>
      ) : null}

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      {!loading && !err && summary ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total events" value={summary.totalEvents} />
            <StatCard label="Logins" value={summary.loginCount} />
            <StatCard label="Signups" value={summary.signupCount} />
            <StatCard label="Bids submitted" value={summary.submitBidCount} />
            <StatCard
              label="Onboarding started"
              value={summary.contractorOnboardingStarted}
            />
            <StatCard
              label="Onboarding submitted"
              value={summary.contractorOnboardingSubmitted}
              hint={`Conversion: ${summary.conversions.onboardingSubmitRate}%`}
            />
            <StatCard
              label="Jobs created"
              value={summary.customerCreateJobSubmitted}
            />
            <StatCard
              label="Mission page opens"
              value={summary.openMissionPageCount}
            />
            <StatCard
              label="Donation checkout starts"
              value={summary.startDonationCheckoutCount}
              hint={`Conversion: ${summary.conversions.missionCheckoutRate}%`}
            />
          </section>

          <section className="rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-6 shadow-sm">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#111827]">
                  Analytics insights
                </h2>
                <p className="mt-1 text-sm text-[#4B5563]">
                  Operational signals derived from the selected event range.
                </p>
              </div>
              <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                {rangeLabel}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InsightCard
                title="Activity health"
                value={summary.totalEvents > 0 ? "Active" : "No activity"}
                detail={`${summary.totalEvents} tracked events in this range.`}
                tone={getActivityTone(summary.totalEvents)}
              />
              <InsightCard
                title="Onboarding funnel"
                value={`${summary.conversions.onboardingSubmitRate}%`}
                detail={`${summary.contractorOnboardingSubmitted} submitted from ${summary.contractorOnboardingStarted} starts.`}
                tone={summary.conversions.onboardingSubmitRate >= 50 ? "good" : "default"}
              />
              <InsightCard
                title="Customer demand"
                value={`${summary.customerCreateJobSubmitted}`}
                detail="Customer job creation events captured in this range."
                tone={summary.customerCreateJobSubmitted > 0 ? "good" : "default"}
              />
              <InsightCard
                title="Contractor supply"
                value={`${summary.submitBidCount}`}
                detail="Submitted bids indicate contractor marketplace activity."
                tone={summary.submitBidCount > 0 ? "good" : "default"}
              />
            </div>
          </section>

          {visibility ? (
            <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#111827]">
                    Visibility snapshot
                  </h2>
                  <p className="mt-1 text-sm text-[#4B5563]">
                    Fast context for where activity is concentrated in the selected range.
                  </p>
                </div>
                <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                  {rangeLabel}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <VisibilityMetric
                  label="Top event share"
                  value={
                    visibility.topEvent
                      ? `${visibility.topEventShare}%`
                      : "No events"
                  }
                  detail={
                    visibility.topEvent
                      ? `${visibility.topEvent.event} is the highest-volume tracked event.`
                      : "No tracked events are available for this range."
                  }
                />
                <VisibilityMetric
                  label="Peak activity day"
                  value={
                    visibility.peakDay.day
                      ? formatDay(visibility.peakDay.day)
                      : "No peak yet"
                  }
                  detail={`${visibility.peakDay.total} events on the busiest day in this range.`}
                />
                <VisibilityMetric
                  label="Active roles"
                  value={`${visibility.activeRoleCount}`}
                  detail="Roles with at least one tracked event in the selected range."
                />
              </div>
            </section>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111827]">
                Events by day
              </h2>

              <div className="mt-4 space-y-3">
                {summary.byDay.length === 0 ? (
                  <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                    No data yet.
                  </div>
                ) : (
                  summary.byDay.map((row) => (
                    <ProgressRow
                      key={row.day}
                      label={formatDay(row.day)}
                      value={row.total}
                      max={visibility?.maxDayTotal ?? 0}
                      share={formatShare(row.total, summary.totalEvents)}
                    />
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111827]">
                Top events
              </h2>

              <div className="mt-4 space-y-3">
                {summary.topEvents.length === 0 ? (
                  <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                    No data yet.
                  </div>
                ) : (
                  summary.topEvents.map((row) => (
                    <ProgressRow
                      key={row.event}
                      label={row.event}
                      value={row.total}
                      max={visibility?.maxEventTotal ?? 0}
                      share={formatShare(row.total, summary.totalEvents)}
                    />
                  ))
                )}
              </div>
            </section>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111827]">
                Role breakdown
              </h2>

              <div className="mt-4 space-y-3">
                {summary.roleBreakdown.length === 0 ? (
                  <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                    No data yet.
                  </div>
                ) : (
                  summary.roleBreakdown.map((row) => (
                    <ProgressRow
                      key={row.role}
                      label={row.role}
                      value={row.total}
                      max={visibility?.maxRoleTotal ?? 0}
                      share={formatShare(row.total, summary.totalEvents)}
                    />
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111827]">
                Key conversions
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
                  <div className="text-sm text-[#4B5563]">
                    Onboarding submit rate
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[#111827]">
                    {summary.conversions.onboardingSubmitRate}%
                  </div>
                  <div className="mt-1 text-xs text-[#6B7280]">
                    submitted / started
                  </div>
                </div>

                <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
                  <div className="text-sm text-[#4B5563]">
                    Mission → checkout rate
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[#111827]">
                    {summary.conversions.missionCheckoutRate}%
                  </div>
                  <div className="mt-1 text-xs text-[#6B7280]">
                    checkout starts / mission opens
                  </div>
                </div>
              </div>
            </section>
          </section>
        </>
      ) : null}
    </div>
  );
}
