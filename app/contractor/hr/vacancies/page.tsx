"use client";

import { useEffect, useMemo, useState } from "react";
import { VACANCY_MARKET_OPTIONS } from "../../../../lib/geo/usStates";
import { normalizeError } from "../../../../lib/errors/normalizeError";
import { withErrorLogging } from "../../../../lib/errors/withErrorLogging";

type AppLikeError = Error & {
  code?: string;
  details?: Record<string, unknown>;
};

type ContractorVacancyItem = {
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
  is_public: boolean | null;
  created_at: string | null;
  application_count?: number | null;
};

type VacancyForm = {
  title: string;
  target_role: string;
  description: string;
  market: string;
  location_text: string;
  employment_type: string;
  pay_type: string;
  pay_range_min: string;
  pay_range_max: string;
  start_date: string;
  duration_type: string;
  workers_needed: string;
  is_public: boolean;
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

const EMPTY_FORM: VacancyForm = {
  title: "",
  target_role: "",
  description: "",
  market: "",
  location_text: "",
  employment_type: "",
  pay_type: "",
  pay_range_min: "",
  pay_range_max: "",
  start_date: "",
  duration_type: "",
  workers_needed: "",
  is_public: true,
};

function getSafeVacancyErrorMessage(error: unknown, fallback: string) {
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

function formatStatus(status: string | null) {
  const value = String(status || "").toLowerCase();

  if (value === "open") return "Open";
  if (value === "closed") return "Closed";
  if (value === "draft") return "Draft";
  return "Unknown";
}

function getStatusBadgeClass(status: string | null) {
  const value = String(status || "").toLowerCase();

  if (value === "open") {
    return "border border-green-200 bg-green-50 text-green-700";
  }

  if (value === "closed") {
    return "border border-red-200 bg-red-50 text-red-700";
  }

  return "border border-[#D9E2EC] bg-[#F8FBFF] text-[#4B5563]";
}

export default function ContractorHrVacanciesPage() {
  const [items, setItems] = useState<ContractorVacancyItem[]>([]);
  const [form, setForm] = useState<VacancyForm>(EMPTY_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [marketFilter, setMarketFilter] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadVacancies() {
      setLoading(true);
      setErr(null);
      setMessage(null);

      try {
        const rows = await withErrorLogging(
          async () => {
            const res = await fetch("/api/contractor/hr/vacancies", {
              method: "GET",
              cache: "no-store",
            });

            const json = await res.json();

            if (!res.ok) {
              throw new Error(json?.error || "Unable to load vacancies");
            }

            return (json?.vacancies ?? []) as ContractorVacancyItem[];
          },
          {
            message: "contractor_hr_vacancies_load_failed",
            code: "contractor_hr_vacancies_load_failed",
            source: "frontend",
            area: "contractor_hr_vacancies",
            role: "contractor",
            path: "/contractor/hr/vacancies",
          }
        );

        if (!mounted) return;
        setItems(rows);
      } catch (error) {
        if (!mounted) return;
        setErr(
          getSafeVacancyErrorMessage(
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
  }, []);

  function updateField<K extends keyof VacancyForm>(
    key: K,
    value: VacancyForm[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setErr(null);
    setMessage(null);

    try {
      const created = await withErrorLogging(
        async () => {
          const res = await fetch("/api/contractor/hr/vacancies", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: form.title.trim() || null,
              targetRole: form.target_role || null,
              description: form.description.trim() || null,
              market: form.market || null,
              locationText: form.location_text.trim() || null,
              employmentType: form.employment_type || null,
              payType: form.pay_type || null,
              payRangeMin:
                form.pay_range_min.trim() === ""
                  ? null
                  : Number(form.pay_range_min),
              payRangeMax:
                form.pay_range_max.trim() === ""
                  ? null
                  : Number(form.pay_range_max),
              startDate: form.start_date || null,
              durationType: form.duration_type || null,
              workersNeeded:
                form.workers_needed.trim() === ""
                  ? null
                  : Number(form.workers_needed),
              isPublic: form.is_public,
            }),
          });

          const json = await res.json();

          if (!res.ok) {
            throw new Error(json?.error || "Unable to create vacancy");
          }

          return json as {
            vacancy?: ContractorVacancyItem;
          };
        },
        {
          message: "contractor_hr_vacancy_create_failed",
          code: "contractor_hr_vacancy_create_failed",
          source: "frontend",
          area: "contractor_hr_vacancies",
          role: "contractor",
          path: "/contractor/hr/vacancies",
        }
      );

      const createdVacancy = created.vacancy;

      if (createdVacancy) {
        setItems((prev) => [createdVacancy, ...prev]);
      }

      setForm(EMPTY_FORM);
      setMessage("Vacancy created.");
    } catch (error) {
      setErr(
        getSafeVacancyErrorMessage(
          error,
          "Unable to create vacancy. Please try again."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseVacancy(vacancyId: string) {
    setClosingId(vacancyId);
    setErr(null);
    setMessage(null);

    try {
      const result = await withErrorLogging(
        async () => {
          const res = await fetch("/api/contractor/hr/vacancies", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              vacancyId,
              status: "closed",
            }),
          });

          const json = await res.json();

          if (!res.ok) {
            throw new Error(json?.error || "Unable to update vacancy");
          }

          return json as {
            vacancy?: {
              id: string;
              status: string | null;
            };
          };
        },
        {
          message: "contractor_hr_vacancy_close_failed",
          code: "contractor_hr_vacancy_close_failed",
          source: "frontend",
          area: "contractor_hr_vacancies",
          role: "contractor",
          path: "/contractor/hr/vacancies",
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
                status: result.vacancy?.status ?? "closed",
              }
            : item
        )
      );

      setMessage("Vacancy closed.");
    } catch (error) {
      setErr(
        getSafeVacancyErrorMessage(
          error,
          "Unable to update vacancy. Please try again."
        )
      );
    } finally {
      setClosingId(null);
    }
  }

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
          item.title,
          item.target_role,
          item.description,
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
        <h1 className="text-2xl font-semibold text-[#0A2E5C]">HR Vacancies</h1>
        <p className="mt-2 text-sm text-[#4B5563]">
          Create specialist-facing vacancies, publish them to the workforce
          marketplace, and manage active staffing needs.
        </p>
      </section>

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

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-[#111827]">
          Create vacancy
        </h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="title"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Vacancy title
            </label>
            <input
              id="title"
              type="text"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Example: Fiber Technician - South Florida"
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            />
          </div>

          <div>
            <label
              htmlFor="target_role"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Target role
            </label>
            <select
              id="target_role"
              value={form.target_role}
              onChange={(e) => updateField("target_role", e.target.value)}
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            >
              <option value="">Select role</option>
              {ROLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Description
            </label>
            <textarea
              id="description"
              rows={5}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Describe the work, expectations, skills needed, and project context."
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            />
          </div>

          <div>
            <label
              htmlFor="market"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Market
            </label>
            <select
              id="market"
              value={form.market}
              onChange={(e) => updateField("market", e.target.value)}
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            >
              <option value="">Select market</option>
              {VACANCY_MARKET_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="location_text"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Location details
            </label>
            <input
              id="location_text"
              type="text"
              value={form.location_text}
              onChange={(e) => updateField("location_text", e.target.value)}
              placeholder="City, metro, or local site notes"
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            />
          </div>

          <div>
            <label
              htmlFor="employment_type"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Employment type
            </label>
            <select
              id="employment_type"
              value={form.employment_type}
              onChange={(e) => updateField("employment_type", e.target.value)}
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            >
              <option value="">Select employment type</option>
              {EMPLOYMENT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="pay_type"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Pay type
            </label>
            <select
              id="pay_type"
              value={form.pay_type}
              onChange={(e) => updateField("pay_type", e.target.value)}
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            >
              <option value="">Select pay type</option>
              {PAY_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="pay_range_min"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Pay range min
            </label>
            <input
              id="pay_range_min"
              type="number"
              min="0"
              step="1"
              value={form.pay_range_min}
              onChange={(e) => updateField("pay_range_min", e.target.value)}
              placeholder="Minimum pay"
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            />
          </div>

          <div>
            <label
              htmlFor="pay_range_max"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Pay range max
            </label>
            <input
              id="pay_range_max"
              type="number"
              min="0"
              step="1"
              value={form.pay_range_max}
              onChange={(e) => updateField("pay_range_max", e.target.value)}
              placeholder="Maximum pay"
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            />
          </div>

          <div>
            <label
              htmlFor="start_date"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Start date
            </label>
            <input
              id="start_date"
              type="date"
              value={form.start_date}
              onChange={(e) => updateField("start_date", e.target.value)}
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            />
          </div>

          <div>
            <label
              htmlFor="duration_type"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Duration
            </label>
            <select
              id="duration_type"
              value={form.duration_type}
              onChange={(e) => updateField("duration_type", e.target.value)}
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            >
              <option value="">Select duration</option>
              {DURATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="workers_needed"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Workers needed
            </label>
            <input
              id="workers_needed"
              type="number"
              min="1"
              step="1"
              value={form.workers_needed}
              onChange={(e) => updateField("workers_needed", e.target.value)}
              placeholder="Number of specialists needed"
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            />
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-3 rounded-xl border border-[#D9E2EC] bg-white px-4 py-3">
              <input
                type="checkbox"
                checked={form.is_public}
                onChange={(e) => updateField("is_public", e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium text-[#111827]">
                Public vacancy
              </span>
            </label>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving || !form.title || !form.target_role}
            className={`rounded-xl px-5 py-3 text-sm font-medium text-white transition ${
              saving || !form.title || !form.target_role
                ? "cursor-not-allowed bg-[#9CA3AF]"
                : "bg-[#1F6FB5] hover:bg-[#0A2E5C]"
            }`}
          >
            {saving ? "Creating..." : "Create vacancy"}
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <label
              htmlFor="search"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Search
            </label>
            <input
              id="search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Title, role, market..."
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            />
          </div>

          <div>
            <label
              htmlFor="status_filter"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Status
            </label>
            <select
              id="status_filter"
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
              htmlFor="market_filter"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Market
            </label>
            <select
              id="market_filter"
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
      </section>

      {loading ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading vacancies...</p>
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
              const isClosing = closingId === item.id;
              const isOpen = String(item.status || "").toLowerCase() === "open";

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

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(
                            item.status
                          )}`}
                        >
                          {formatStatus(item.status)}
                        </span>

                        <span className="inline-flex rounded-full border border-[#D9E2EC] bg-[#F8FBFF] px-2.5 py-1 text-xs font-medium text-[#4B5563]">
                          {item.is_public ? "Public" : "Private"}
                        </span>
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
                        <div>
                          <span className="font-medium text-[#111827]">
                            Applications:
                          </span>{" "}
                          {item.application_count ?? 0}
                        </div>
                        <div>
                          <span className="font-medium text-[#111827]">
                            Created:
                          </span>{" "}
                          {formatDate(item.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-3">
                      {isOpen ? (
                        <button
                          type="button"
                          onClick={() => void handleCloseVacancy(item.id)}
                          disabled={isClosing}
                          className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                            isClosing
                              ? "cursor-not-allowed border border-[#D9E2EC] bg-white text-[#9CA3AF]"
                              : "border border-red-200 bg-white text-red-700 hover:bg-red-50"
                          }`}
                        >
                          {isClosing ? "Closing..." : "Close vacancy"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      ) : null}
    </main>
  );
}