"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeError } from "../../../lib/errors/normalizeError";
import { withErrorLogging } from "../../../lib/errors/withErrorLogging";

type AppLikeError = Error & {
  code?: string;
  details?: Record<string, unknown>;
};

type ApplicationItem = {
  id: string;
  vacancy_id: string;
  status: string | null;
  message: string | null;
  applied_at: string | null;
  reviewed_at: string | null;
  vacancy_title: string | null;
  target_role: string | null;
  market: string | null;
  location_text: string | null;
  employment_type: string | null;
  company_name: string | null;
};

function getSafeApplicationsErrorMessage(error: unknown, fallback: string) {
  const normalized = normalizeError(error) as AppLikeError;
  const code = String(normalized.code || "");

  if (code.includes("not_logged_in")) {
    return "Your session has expired. Please log in again.";
  }

  return fallback;
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString();
}

function formatStatus(status: string | null) {
  const value = String(status || "").toLowerCase();

  if (value === "submitted") return "Submitted";
  if (value === "pending") return "Pending";
  if (value === "reviewed") return "Reviewed";
  if (value === "accepted") return "Accepted";
  if (value === "rejected") return "Rejected";
  return "Unknown";
}

function getStatusBadgeClass(status: string | null) {
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

export default function WorkerApplicationsPage() {
  const [items, setItems] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [marketFilter, setMarketFilter] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadApplications() {
      setLoading(true);
      setErr(null);

      try {
        const rows = await withErrorLogging(
          async () => {
            const res = await fetch("/api/worker/applications", {
              method: "GET",
              cache: "no-store",
            });

            const json = await res.json();

            if (!res.ok) {
              throw new Error(json?.error || "Unable to load applications");
            }

            return (json?.applications ?? []) as ApplicationItem[];
          },
          {
            message: "specialist_applications_load_failed",
            code: "specialist_applications_load_failed",
            source: "frontend",
            area: "worker_applications",
            role: "specialist",
            path: "/worker/applications",
          }
        );

        if (!mounted) return;

        setItems(rows);
      } catch (error) {
        if (!mounted) return;
        setErr(
          getSafeApplicationsErrorMessage(
            error,
            "Unable to load applications. Please refresh and try again."
          )
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadApplications();

    return () => {
      mounted = false;
    };
  }, []);

  const statusOptions = useMemo(() => {
    return Array.from(
      new Set(items.map((item) => item.status).filter(Boolean) as string[])
    ).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const marketOptions = useMemo(() => {
    return Array.from(
      new Set(items.map((item) => item.market).filter(Boolean) as string[])
    ).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesStatus =
        statusFilter === "" || item.status === statusFilter;

      const matchesMarket =
        marketFilter === "" || item.market === marketFilter;

      const matchesQuery =
        normalizedQuery === "" ||
        [
          item.vacancy_title,
          item.target_role,
          item.company_name,
          item.market,
          item.location_text,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedQuery)
          );

      return matchesStatus && matchesMarket && matchesQuery;
    });
  }, [items, marketFilter, query, statusFilter]);

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#0A2E5C]">
          Applications
        </h1>
        <p className="mt-2 text-sm text-[#4B5563]">
          Track the vacancies you applied to and monitor each application
          status.
        </p>
      </section>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <label
              htmlFor="applications-search"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Search
            </label>
            <input
              id="applications-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Title, role, company, market..."
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            />
          </div>

          <div>
            <label
              htmlFor="applications-status"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Status
            </label>
            <select
              id="applications-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            >
              <option value="">All statuses</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {formatStatus(option)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="applications-market"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Market
            </label>
            <select
              id="applications-market"
              value={marketFilter}
              onChange={(e) => setMarketFilter(e.target.value)}
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            >
              <option value="">All markets</option>
              {marketOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-[#4B5563]">
          {filteredItems.length} application
          {filteredItems.length === 1 ? "" : "s"}
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading applications...</p>
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
              No applications found for the current filters.
            </div>
          ) : (
            filteredItems.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-[#111827]">
                        {item.vacancy_title || "Vacancy"}
                      </h2>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(
                          item.status
                        )}`}
                      >
                        {formatStatus(item.status)}
                      </span>
                    </div>

                    <div className="mt-2 text-sm text-[#4B5563]">
                      {item.company_name || "Contractor company"}
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-[#4B5563] sm:grid-cols-2 xl:grid-cols-3">
                      <div>
                        <span className="font-medium text-[#111827]">
                          Role:
                        </span>{" "}
                        {item.target_role || "Not specified"}
                      </div>
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
                          Applied:
                        </span>{" "}
                        {formatDate(item.applied_at)}
                      </div>
                      <div>
                        <span className="font-medium text-[#111827]">
                          Reviewed:
                        </span>{" "}
                        {formatDate(item.reviewed_at)}
                      </div>
                    </div>

                    {item.message ? (
                      <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
                        <div className="text-sm font-medium text-[#111827]">
                          Your message
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[#4B5563]">
                          {item.message}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-3">
                    <a
                      href="/worker/vacancies"
                      className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                    >
                      Browse vacancies
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