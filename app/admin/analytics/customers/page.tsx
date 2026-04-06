"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase/browser";
import { getMyProfile } from "../../../../lib/profile";

type AnalyticsRange = "1d" | "7d" | "30d" | "all";

type AnalyticsBreakdown = {
  range: AnalyticsRange;
  segment: "customers";
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

function formatDay(day: string) {
  return new Date(day).toLocaleDateString();
}

export default function AdminCustomerAnalyticsPage() {
  const router = useRouter();

  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<AnalyticsBreakdown | null>(null);

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

      const res = await fetch(
        `/api/admin/analytics/breakdown?segment=customers&range=${selectedRange}`,
        { cache: "no-store" }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load customer analytics.");
      }

      setBreakdown(json.breakdown);
    } catch (e: any) {
      setErr(e.message ?? "Load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const rangeLabel = useMemo(() => {
    if (range === "1d") return "Last 24 hours";
    if (range === "7d") return "Last 7 days";
    if (range === "30d") return "Last 30 days";
    return "All time";
  }, [range]);

  const customerSignups = breakdown?.events.signup ?? 0;
  const jobsCreated = breakdown?.events.customer_create_job_submitted ?? 0;
  const jobCreationRate = breakdown?.conversions.customerJobCreationRate ?? 0;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827]">
              Customer Analytics
            </h1>
            <p className="mt-2 text-sm text-[#4B5563]">
              Customer-side activity, job creation, and conversion behavior.
            </p>
            <div className="mt-2 text-xs text-[#6B7280]">{rangeLabel}</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/analytics"
              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              Back to analytics
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
          <p className="text-sm text-[#4B5563]">Loading customer analytics...</p>
        </section>
      ) : null}

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      {!loading && !err && breakdown ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total customer events" value={breakdown.totalEvents} />
            <StatCard label="Customer signups" value={customerSignups} />
            <StatCard label="Jobs created" value={jobsCreated} />
            <StatCard
              label="Job creation rate"
              value={`${jobCreationRate}%`}
              hint="jobs created / signups"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111827]">
                Events by day
              </h2>

              <div className="mt-4 space-y-3">
                {breakdown.byDay.length === 0 ? (
                  <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                    No data yet.
                  </div>
                ) : (
                  breakdown.byDay.map((row) => (
                    <div
                      key={row.day}
                      className="flex items-center justify-between rounded-xl border border-[#D9E2EC] bg-[#FCFDFE] px-4 py-3"
                    >
                      <div className="text-sm font-medium text-[#111827]">
                        {formatDay(row.day)}
                      </div>
                      <div className="text-sm text-[#4B5563]">{row.total}</div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111827]">Top events</h2>

              <div className="mt-4 space-y-3">
                {breakdown.topEvents.length === 0 ? (
                  <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                    No data yet.
                  </div>
                ) : (
                  breakdown.topEvents.map((row) => (
                    <div
                      key={row.event}
                      className="flex items-center justify-between rounded-xl border border-[#D9E2EC] bg-[#FCFDFE] px-4 py-3"
                    >
                      <div className="break-all text-sm font-medium text-[#111827]">
                        {row.event}
                      </div>
                      <div className="text-sm text-[#4B5563]">{row.total}</div>
                    </div>
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
                {breakdown.roleBreakdown.length === 0 ? (
                  <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                    No data yet.
                  </div>
                ) : (
                  breakdown.roleBreakdown.map((row) => (
                    <div
                      key={row.role}
                      className="flex items-center justify-between rounded-xl border border-[#D9E2EC] bg-[#FCFDFE] px-4 py-3"
                    >
                      <div className="text-sm font-medium text-[#111827]">
                        {row.role}
                      </div>
                      <div className="text-sm text-[#4B5563]">{row.total}</div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111827]">
                Event totals
              </h2>

              <div className="mt-4 space-y-3">
                {Object.keys(breakdown.events).length === 0 ? (
                  <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                    No data yet.
                  </div>
                ) : (
                  Object.entries(breakdown.events)
                    .sort((a, b) => b[1] - a[1])
                    .map(([event, total]) => (
                      <div
                        key={event}
                        className="flex items-center justify-between rounded-xl border border-[#D9E2EC] bg-[#FCFDFE] px-4 py-3"
                      >
                        <div className="break-all text-sm font-medium text-[#111827]">
                          {event}
                        </div>
                        <div className="text-sm text-[#4B5563]">{total}</div>
                      </div>
                    ))
                )}
              </div>
            </section>
          </section>
        </>
      ) : null}
    </div>
  );
}