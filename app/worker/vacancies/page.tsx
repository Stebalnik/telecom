"use client";

import { useEffect, useMemo, useState } from "react";
import { VACANCY_MARKET_OPTIONS } from "../../../lib/geo/usStates";
import { normalizeError } from "../../../lib/errors/normalizeError";
import { withErrorLogging } from "../../../lib/errors/withErrorLogging";

type AppLikeError = Error & {
  code?: string;
  details?: Record<string, unknown>;
};

type VacancyItem = {
  id: string;
  title: string | null;
  target_role: string | null;
  description: string | null;
  market: string | null;
  location_text: string | null;
  employment_type: string | null;
  pay_type: string | null;
  pay_range_min: number | null;
  pay_range_max: number | null;
  start_date: string | null;
  duration_type: string | null;
  workers_needed: number | null;
  status: string | null;
  company_name: string | null;
  has_applied?: boolean | null;
  application_status?: string | null;
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

const EMPLOYMENT_OPTIONS = [
  "Full-time",
  "Part-time",
  "Contract",
  "Project-based",
  "Temporary",
  "Emergency deployments",
] as const;

const PAY_TYPE_OPTIONS = ["hour", "day", "week", "month", "project"] as const;

const DURATION_OPTIONS = [
  "1 week",
  "2 weeks",
  "1 month",
  "2 months",
  "3 months",
  "6 months",
  "Long-term",
  "Project-based",
] as const;

function getSafeVacanciesErrorMessage(error: unknown, fallback: string) {
  const normalized = normalizeError(error) as AppLikeError;
  const code = String(normalized.code || "");

  if (code.includes("not_logged_in")) {
    return "Your session has expired. Please log in again.";
  }

  return fallback;
}

function formatMoneyRange(
  min: number | null,
  max: number | null,
  payType: string | null
) {
  const suffix = payType ? ` / ${payType}` : "";

  if (typeof min === "number" && typeof max === "number") {
    if (min === max) {
      return `$${min.toLocaleString()}${suffix}`;
    }

    return `$${min.toLocaleString()} - $${max.toLocaleString()}${suffix}`;
  }

  if (typeof min === "number") {
    return `From $${min.toLocaleString()}${suffix}`;
  }

  if (typeof max === "number") {
    return `Up to $${max.toLocaleString()}${suffix}`;
  }

  return "Not specified";
}

function formatDate(value: string | null) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not specified";
  }

  return date.toLocaleDateString();
}

function formatApplicationStatus(status: string | null | undefined) {
  const value = String(status || "").toLowerCase();

  if (value === "submitted") return "Submitted";
  if (value === "pending") return "Pending";
  if (value === "reviewed") return "Reviewed";
  if (value === "accepted") return "Accepted";
  if (value === "rejected") return "Rejected";
  return "Not applied";
}

function getApplicationBadgeClass(status: string | null | undefined) {
  const value = String(status || "").toLowerCase();

  if (value === "accepted") {
    return "border border-green-200 bg-green-50 text-green-700";
  }

  if (value === "rejected") {
    return "border border-red-200 bg-red-50 text-red-700";
  }

  if (value === "submitted" || value === "pending" || value === "reviewed") {
    return "border border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border border-[#D9E2EC] bg-[#F8FBFF] text-[#4B5563]";
}

function startsSoon(value: string | null) {
  if (!value) return false;

  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return false;

  const now = new Date();
  const diffMs = start.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays >= 0 && diffDays <= 14;
}

export default function WorkerVacanciesPage() {
  const [items, setItems] = useState<VacancyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [marketFilter, setMarketFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState("");

  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [payTypeFilter, setPayTypeFilter] = useState("");
  const [durationFilter, setDurationFilter] = useState("");
  const [startTimingFilter, setStartTimingFilter] = useState("");
  const [appliedFilter, setAppliedFilter] = useState("");

  const [applyingVacancyId, setApplyingVacancyId] = useState<string | null>(
    null
  );
  const [applyMessage, setApplyMessage] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadVacancies() {
      setLoading(true);
      setErr(null);
      setMessage(null);

      try {
        const searchParams = new URLSearchParams();

        if (query.trim()) {
          searchParams.set("search", query.trim());
        }

        if (marketFilter) {
          searchParams.set("market", marketFilter);
        }

        if (roleFilter) {
          searchParams.set("role", roleFilter);
        }

        if (employmentFilter) {
          searchParams.set("employmentType", employmentFilter);
        }

        if (payTypeFilter) {
          searchParams.set("payType", payTypeFilter);
        }

        if (durationFilter) {
          searchParams.set("durationType", durationFilter);
        }

        if (appliedFilter === "applied" || appliedFilter === "not_applied") {
          searchParams.set("applied", appliedFilter);
        }

        const apiPath = searchParams.toString()
          ? `/api/worker/vacancies?${searchParams.toString()}`
          : "/api/worker/vacancies";

        const rows = await withErrorLogging(
          async () => {
            const res = await fetch(apiPath, {
              method: "GET",
              cache: "no-store",
            });

            const json = await res.json();

            if (!res.ok) {
              throw new Error(json?.error || "Unable to load vacancies");
            }

            return (json?.vacancies ?? []) as VacancyItem[];
          },
          {
            message: "specialist_vacancies_load_failed",
            code: "specialist_vacancies_load_failed",
            source: "frontend",
            area: "worker_vacancies",
            role: "specialist",
            path: "/worker/vacancies",
            details: {
              search: query.trim() || null,
              market: marketFilter || null,
              role: roleFilter || null,
              employmentType: employmentFilter || null,
              payType: payTypeFilter || null,
              durationType: durationFilter || null,
              applied: appliedFilter || null,
            },
          }
        );

        if (!mounted) return;
        setItems(rows);
      } catch (error) {
        if (!mounted) return;
        setErr(
          getSafeVacanciesErrorMessage(
            error,
            "Unable to load vacancies. Please refresh and try again."
          )
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadVacancies();

    return () => {
      mounted = false;
    };
  }, [
    appliedFilter,
    durationFilter,
    employmentFilter,
    marketFilter,
    payTypeFilter,
    query,
    roleFilter,
  ]);

  const filteredItems = useMemo(() => {
    if (startTimingFilter === "") {
      return items;
    }

    return items.filter((item) => {
      return (
        (startTimingFilter === "starts_soon" && startsSoon(item.start_date)) ||
        (startTimingFilter === "future" &&
          !!item.start_date &&
          !startsSoon(item.start_date))
      );
    });
  }, [items, startTimingFilter]);

  async function handleApply(vacancyId: string) {
    setSubmitLoading(true);
    setErr(null);
    setMessage(null);

    try {
      const result = await withErrorLogging(
        async () => {
          const res = await fetch("/api/worker/applications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              vacancyId,
              message: applyMessage.trim() || null,
            }),
          });

          const json = await res.json();

          if (!res.ok) {
            throw new Error(json?.error || "Unable to submit application");
          }

          return json as {
            application?: {
              status?: string | null;
            };
          };
        },
        {
          message: "specialist_apply_to_vacancy_failed",
          code: "specialist_apply_to_vacancy_failed",
          source: "frontend",
          area: "worker_vacancies",
          role: "specialist",
          path: "/worker/vacancies",
          details: {
            vacancyId,
          },
        }
      );

      setItems((prev) =>
        prev.map((item) =>
          item.id === vacancyId
            ? {
                ...item,
                has_applied: true,
                application_status:
                  result.application?.status ?? "submitted",
              }
            : item
        )
      );

      setApplyingVacancyId(null);
      setApplyMessage("");
      setMessage("Application submitted.");
    } catch (error) {
      setErr(
        getSafeVacanciesErrorMessage(
          error,
          "Unable to submit your application. Please try again."
        )
      );
    } finally {
      setSubmitLoading(false);
    }
  }

  function resetFilters() {
    setQuery("");
    setMarketFilter("");
    setRoleFilter("");
    setEmploymentFilter("");
    setPayTypeFilter("");
    setDurationFilter("");
    setStartTimingFilter("");
    setAppliedFilter("");
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#0A2E5C]">Vacancies</h1>
        <p className="mt-2 text-sm text-[#4B5563]">
          Search vacancies by market or role, then refine the results with
          structured filters and submit applications directly from the listing.
        </p>
      </section>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <label
              htmlFor="vacancy-search"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Search
            </label>
            <input
              id="vacancy-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Market or role title..."
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            />
          </div>

          <div>
            <label
              htmlFor="market-filter"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Market
            </label>
            <select
              id="market-filter"
              value={marketFilter}
              onChange={(e) => setMarketFilter(e.target.value)}
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            >
              <option value="">All markets</option>
              {VACANCY_MARKET_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="role-filter"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Role
            </label>
            <select
              id="role-filter"
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
              htmlFor="employment-filter"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Employment type
            </label>
            <select
              id="employment-filter"
              value={employmentFilter}
              onChange={(e) => setEmploymentFilter(e.target.value)}
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            >
              <option value="">All employment types</option>
              {EMPLOYMENT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowMoreFilters((prev) => !prev)}
            className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
          >
            {showMoreFilters ? "Hide more filters" : "More filters"}
          </button>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
          >
            Reset filters
          </button>

          <div className="text-sm text-[#4B5563]">
            {filteredItems.length} result{filteredItems.length === 1 ? "" : "s"}
          </div>
        </div>

        {showMoreFilters ? (
          <div className="mt-4 grid gap-4 border-t border-[#E5EDF5] pt-4 lg:grid-cols-4">
            <div>
              <label
                htmlFor="pay-type-filter"
                className="mb-2 block text-sm font-medium text-[#111827]"
              >
                Pay type
              </label>
              <select
                id="pay-type-filter"
                value={payTypeFilter}
                onChange={(e) => setPayTypeFilter(e.target.value)}
                className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              >
                <option value="">All pay types</option>
                {PAY_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="duration-filter"
                className="mb-2 block text-sm font-medium text-[#111827]"
              >
                Duration
              </label>
              <select
                id="duration-filter"
                value={durationFilter}
                onChange={(e) => setDurationFilter(e.target.value)}
                className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              >
                <option value="">All durations</option>
                {DURATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="start-timing-filter"
                className="mb-2 block text-sm font-medium text-[#111827]"
              >
                Start timing
              </label>
              <select
                id="start-timing-filter"
                value={startTimingFilter}
                onChange={(e) => setStartTimingFilter(e.target.value)}
                className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              >
                <option value="">Any start timing</option>
                <option value="starts_soon">Starts within 14 days</option>
                <option value="future">Later start</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="applied-filter"
                className="mb-2 block text-sm font-medium text-[#111827]"
              >
                Application status
              </label>
              <select
                id="applied-filter"
                value={appliedFilter}
                onChange={(e) => setAppliedFilter(e.target.value)}
                className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              >
                <option value="">All vacancies</option>
                <option value="not_applied">Not applied</option>
                <option value="applied">Applied</option>
              </select>
            </div>
          </div>
        ) : null}
      </section>

      {loading ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading vacancies...</p>
        </section>
      ) : null}

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      {message ? (
        <section className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 shadow-sm">
          {message}
        </section>
      ) : null}

      {!loading ? (
        <section className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-[#D9E2EC] bg-white p-6 text-sm text-[#4B5563] shadow-sm">
              No vacancies found for the current filters.
            </div>
          ) : (
            filteredItems.map((item) => {
              const isApplyOpen = applyingVacancyId === item.id;
              const alreadyApplied = Boolean(item.has_applied);

              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-[#111827]">
                          {item.title || "Vacancy"}
                        </h2>

                        <span className="inline-flex rounded-full border border-[#D9E2EC] bg-[#F8FBFF] px-2.5 py-1 text-xs font-medium text-[#4B5563]">
                          {item.target_role || "Role not specified"}
                        </span>

                        {alreadyApplied ? (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getApplicationBadgeClass(
                              item.application_status
                            )}`}
                          >
                            {formatApplicationStatus(item.application_status)}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 text-sm text-[#4B5563]">
                        {item.company_name || "Contractor company"}
                      </div>

                      <p className="mt-4 text-sm leading-6 text-[#4B5563]">
                        {item.description || "No description provided yet."}
                      </p>

                      <div className="mt-4 grid gap-3 text-sm text-[#4B5563] sm:grid-cols-2 xl:grid-cols-3">
                        <div>
                          <span className="font-medium text-[#111827]">
                            Market:
                          </span>{" "}
                          {item.market || "Not specified"}
                        </div>
                        <div>
                          <span className="font-medium text-[#111827]">
                            Location:
                          </span>{" "}
                          {item.location_text || "Not specified"}
                        </div>
                        <div>
                          <span className="font-medium text-[#111827]">
                            Employment:
                          </span>{" "}
                          {item.employment_type || "Not specified"}
                        </div>
                        <div>
                          <span className="font-medium text-[#111827]">
                            Pay:
                          </span>{" "}
                          {formatMoneyRange(
                            item.pay_range_min,
                            item.pay_range_max,
                            item.pay_type
                          )}
                        </div>
                        <div>
                          <span className="font-medium text-[#111827]">
                            Start date:
                          </span>{" "}
                          {formatDate(item.start_date)}
                        </div>
                        <div>
                          <span className="font-medium text-[#111827]">
                            Duration:
                          </span>{" "}
                          {item.duration_type || "Not specified"}
                        </div>
                        <div>
                          <span className="font-medium text-[#111827]">
                            Workers needed:
                          </span>{" "}
                          {item.workers_needed ?? "Not specified"}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-3">
                      {alreadyApplied ? (
                        <a
                          href="/worker/applications"
                          className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                        >
                          View applications
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setApplyingVacancyId(isApplyOpen ? null : item.id);
                            setApplyMessage("");
                            setErr(null);
                            setMessage(null);
                          }}
                          className="rounded-xl bg-[#1F6FB5] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
                        >
                          {isApplyOpen ? "Close" : "Apply"}
                        </button>
                      )}
                    </div>
                  </div>

                  {isApplyOpen && !alreadyApplied ? (
                    <div className="mt-5 rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
                      <label
                        htmlFor={`apply-message-${item.id}`}
                        className="mb-2 block text-sm font-medium text-[#111827]"
                      >
                        Application message
                      </label>
                      <textarea
                        id={`apply-message-${item.id}`}
                        rows={4}
                        value={applyMessage}
                        onChange={(e) => setApplyMessage(e.target.value)}
                        placeholder="Introduce yourself, summarize your relevant experience, and mention your availability."
                        className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                      />

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => void handleApply(item.id)}
                          disabled={submitLoading}
                          className={`rounded-xl px-5 py-3 text-sm font-medium text-white transition ${
                            submitLoading
                              ? "cursor-not-allowed bg-[#9CA3AF]"
                              : "bg-[#2EA3FF] hover:bg-[#1F6FB5]"
                          }`}
                        >
                          {submitLoading
                            ? "Submitting..."
                            : "Submit application"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setApplyingVacancyId(null);
                            setApplyMessage("");
                          }}
                          className="rounded-xl border border-[#D9E2EC] bg-white px-5 py-3 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </section>
      ) : null}
    </main>
  );
}