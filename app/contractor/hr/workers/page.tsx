"use client";

import { useEffect, useMemo, useState } from "react";
import {
  HOME_MARKET_OPTIONS,
} from "../../../../lib/geo/usStates";
import { normalizeError } from "../../../../lib/errors/normalizeError";
import { withErrorLogging } from "../../../../lib/errors/withErrorLogging";

type AppLikeError = Error & {
  code?: string;
  details?: Record<string, unknown>;
};

type WorkerItem = {
  user_id: string;
  full_name: string | null;
  headline: string | null;
  summary: string | null;
  primary_role: string | null;
  secondary_roles: string[] | null;
  years_experience: number | null;
  home_market: string | null;
  markets: string[] | null;
  travel_willingness: string | null;
  employment_type_preference: string[] | null;
  availability_mode: string | null;
  phone: string | null;
};

const ROLE_OPTIONS = [
  "Technician",
  "Climber",
  "Rigger",
  "Fiber Tech",
  "Foreman",
  "Electrician",
  "RF Tech",
  "Project Manager",
  "Inspector",
  "Driver",
  "Other",
] as const;

const EMPLOYMENT_PREFERENCE_OPTIONS = [
  "Full-time",
  "Part-time",
  "Contract",
  "Project-based",
  "Temporary",
  "Emergency deployments",
] as const;

const TRAVEL_WILLINGNESS_OPTIONS = [
  "Local only",
  "Within home state",
  "Regional travel",
  "Multi-state travel",
  "Nationwide travel",
] as const;

const AVAILABILITY_MODE_OPTIONS = [
  "Available now",
  "Available this week",
  "Available this month",
  "Weekdays only",
  "Weekends only",
  "Part-time only",
  "By project schedule",
] as const;

function getSafeWorkersErrorMessage(error: unknown, fallback: string) {
  const normalized = normalizeError(error) as AppLikeError;
  const code = String(normalized.code || "");

  if (code.includes("not_logged_in")) {
    return "Your session has expired. Please log in again.";
  }

  return fallback;
}

function formatExperience(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Not specified";
  }

  if (value <= 0) {
    return "Less than 1 year";
  }

  if (value === 1) {
    return "1 year";
  }

  if (value >= 10) {
    return "10+ years";
  }

  return `${value} years`;
}

export default function ContractorHrWorkersPage() {
  const [items, setItems] = useState<WorkerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [marketFilter, setMarketFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState("");
  const [travelFilter, setTravelFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadWorkers() {
      setLoading(true);
      setErr(null);

      try {
        const rows = await withErrorLogging(
          async () => {
            const res = await fetch("/api/contractor/hr/workers", {
              method: "GET",
              cache: "no-store",
            });

            const json = await res.json();

            if (!res.ok) {
              throw new Error(json?.error || "Unable to load workers");
            }

            return (json?.workers ?? []) as WorkerItem[];
          },
          {
            message: "contractor_hr_workers_load_failed",
            code: "contractor_hr_workers_load_failed",
            source: "frontend",
            area: "contractor_hr_workers",
            role: "contractor",
            path: "/contractor/hr/workers",
          }
        );

        if (!mounted) return;
        setItems(rows);
      } catch (error) {
        if (!mounted) return;
        setErr(
          getSafeWorkersErrorMessage(
            error,
            "Unable to load workers. Please refresh and try again."
          )
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadWorkers();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((item) => {
      const fullText = [
        item.full_name,
        item.headline,
        item.summary,
        item.primary_role,
        ...(item.secondary_roles ?? []),
        item.home_market,
        ...(item.markets ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery =
        normalizedQuery === "" || fullText.includes(normalizedQuery);

      const matchesMarket =
        marketFilter === "" ||
        item.home_market === marketFilter ||
        (item.markets ?? []).includes(marketFilter);

      const matchesRole =
        roleFilter === "" ||
        item.primary_role === roleFilter ||
        (item.secondary_roles ?? []).includes(roleFilter);

      const matchesEmployment =
        employmentFilter === "" ||
        (item.employment_type_preference ?? []).includes(employmentFilter);

      const matchesTravel =
        travelFilter === "" || item.travel_willingness === travelFilter;

      const matchesAvailability =
        availabilityFilter === "" || item.availability_mode === availabilityFilter;

      return (
        matchesQuery &&
        matchesMarket &&
        matchesRole &&
        matchesEmployment &&
        matchesTravel &&
        matchesAvailability
      );
    });
  }, [
    availabilityFilter,
    employmentFilter,
    items,
    marketFilter,
    query,
    roleFilter,
    travelFilter,
  ]);

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#0A2E5C]">Workers</h1>
        <p className="mt-2 text-sm text-[#4B5563]">
          Search specialist profiles using structured filters such as role,
          market, employment preference, travel willingness, and availability.
        </p>
      </section>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-3">
            <label
              htmlFor="workers-search"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Search
            </label>
            <input
              id="workers-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, role, market, headline..."
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            />
          </div>

          <div>
            <label
              htmlFor="workers-market"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Market
            </label>
            <select
              id="workers-market"
              value={marketFilter}
              onChange={(e) => setMarketFilter(e.target.value)}
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            >
              <option value="">All markets</option>
              {HOME_MARKET_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              <option value="Nationwide">Nationwide</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="workers-role"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Role
            </label>
            <select
              id="workers-role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            >
              <option value="">All roles</option>
              {ROLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="workers-employment"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Employment preference
            </label>
            <select
              id="workers-employment"
              value={employmentFilter}
              onChange={(e) => setEmploymentFilter(e.target.value)}
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            >
              <option value="">All preferences</option>
              {EMPLOYMENT_PREFERENCE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="workers-travel"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Travel willingness
            </label>
            <select
              id="workers-travel"
              value={travelFilter}
              onChange={(e) => setTravelFilter(e.target.value)}
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            >
              <option value="">All travel options</option>
              {TRAVEL_WILLINGNESS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="workers-availability"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Availability mode
            </label>
            <select
              id="workers-availability"
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            >
              <option value="">All availability modes</option>
              {AVAILABILITY_MODE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-[#4B5563]">
          {filteredItems.length} worker{filteredItems.length === 1 ? "" : "s"}
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading workers...</p>
        </section>
      ) : null}

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      {!loading ? (
        <section className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-[#D9E2EC] bg-white p-6 text-sm text-[#4B5563] shadow-sm">
              No workers found for the current filters.
            </div>
          ) : (
            filteredItems.map((item) => (
              <article
                key={item.user_id}
                className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-[#111827]">
                        {item.full_name || "Unnamed specialist"}
                      </h2>

                      <span className="inline-flex rounded-full border border-[#D9E2EC] bg-[#F8FBFF] px-2.5 py-1 text-xs font-medium text-[#4B5563]">
                        {item.primary_role || "Role not specified"}
                      </span>
                    </div>

                    {item.headline ? (
                      <div className="mt-2 text-sm text-[#4B5563]">
                        {item.headline}
                      </div>
                    ) : null}

                    {item.summary ? (
                      <p className="mt-4 text-sm leading-6 text-[#4B5563]">
                        {item.summary}
                      </p>
                    ) : null}

                    <div className="mt-4 grid gap-3 text-sm text-[#4B5563] sm:grid-cols-2 xl:grid-cols-3">
                      <div>
                        <span className="font-medium text-[#111827]">
                          Experience:
                        </span>{" "}
                        {formatExperience(item.years_experience)}
                      </div>
                      <div>
                        <span className="font-medium text-[#111827]">
                          Home market:
                        </span>{" "}
                        {item.home_market || "Not specified"}
                      </div>
                      <div>
                        <span className="font-medium text-[#111827]">
                          Travel:
                        </span>{" "}
                        {item.travel_willingness || "Not specified"}
                      </div>
                      <div>
                        <span className="font-medium text-[#111827]">
                          Availability:
                        </span>{" "}
                        {item.availability_mode || "Not specified"}
                      </div>
                      <div>
                        <span className="font-medium text-[#111827]">
                          Phone:
                        </span>{" "}
                        {item.phone || "Not specified"}
                      </div>
                    </div>

                    {(item.secondary_roles ?? []).length > 0 ? (
                      <div className="mt-4">
                        <div className="text-sm font-medium text-[#111827]">
                          Secondary roles
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(item.secondary_roles ?? []).map((role) => (
                            <span
                              key={`${item.user_id}-secondary-${role}`}
                              className="inline-flex rounded-full border border-[#D9E2EC] bg-[#F8FBFF] px-3 py-1.5 text-xs font-medium text-[#4B5563]"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {(item.markets ?? []).length > 0 ? (
                      <div className="mt-4">
                        <div className="text-sm font-medium text-[#111827]">
                          Ready to work in
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(item.markets ?? []).map((market) => (
                            <span
                              key={`${item.user_id}-market-${market}`}
                              className="inline-flex rounded-full border border-[#D9E2EC] bg-[#F8FBFF] px-3 py-1.5 text-xs font-medium text-[#4B5563]"
                            >
                              {market}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {(item.employment_type_preference ?? []).length > 0 ? (
                      <div className="mt-4">
                        <div className="text-sm font-medium text-[#111827]">
                          Employment preferences
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(item.employment_type_preference ?? []).map((value) => (
                            <span
                              key={`${item.user_id}-employment-${value}`}
                              className="inline-flex rounded-full border border-[#D9E2EC] bg-[#F8FBFF] px-3 py-1.5 text-xs font-medium text-[#4B5563]"
                            >
                              {value}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-3">
                    <a
                      href="/contractor/hr/invitations"
                      className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                    >
                      Manage invitations
                    </a>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      ) : null}
    </main>
  );
}