"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase/browser";
import { getMyProfile } from "../../../lib/profile";
import { logError } from "../../../lib/logError";

type ErrorLogLevel = "info" | "warning" | "error" | "critical";

type ErrorLogRow = {
  id: string;
  user_id: string | null;
  role: string | null;
  message: string;
  details: Record<string, unknown> | null;
  path: string | null;
  level: ErrorLogLevel | null;
  source: string | null;
  area: string | null;
  code: string | null;
  status_code: number | null;
  fingerprint: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  is_resolved?: boolean;
};

type ErrorSummary = {
  total: number;
  unresolvedCount: number;
  criticalCount: number;
  byLevel: Record<string, number>;
  bySource: Record<string, number>;
  byArea: Record<string, number>;
  topFingerprints: Array<{
    fingerprint: string;
    total: number;
  }>;
};

type Pagination = {
  limit: number;
  offset: number;
  total: number;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function LevelBadge({ level }: { level: string | null | undefined }) {
  const value = level || "unknown";

  const styles =
    value === "critical"
      ? "border-red-200 bg-red-50 text-red-700"
      : value === "error"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : value === "warning"
      ? "border-yellow-200 bg-yellow-50 text-yellow-700"
      : value === "info"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-[#D9E2EC] bg-[#F8FAFC] text-[#4B5563]";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${styles}`}
    >
      {value}
    </span>
  );
}

function StatusBadge({ resolvedAt }: { resolvedAt: string | null | undefined }) {
  const resolved = !!resolvedAt;

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        resolved
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {resolved ? "resolved" : "unresolved"}
    </span>
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

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export default function AdminErrorsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [rows, setRows] = useState<ErrorLogRow[]>([]);
  const [summary, setSummary] = useState<ErrorSummary | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    limit: 50,
    offset: 0,
    total: 0,
  });

  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [level, setLevel] = useState("all");
  const [source, setSource] = useState("all");
  const [area, setArea] = useState("all");
  const [resolved, setResolved] = useState("false");

  async function ensureAdminAccess() {
    const { data } = await supabase.auth.getSession();

    if (!data.session?.user) {
      router.replace("/login");
      return false;
    }

    const profile = await getMyProfile();

    if (!profile || profile.role !== "admin") {
      router.replace("/dashboard");
      return false;
    }

    return true;
  }

  function buildQueryString(opts?: { summary?: boolean; offset?: number }) {
    const params = new URLSearchParams();

    if (opts?.summary) {
      params.set("summary", "true");
      params.set("limit", "500");
    } else {
      params.set("limit", String(pagination.limit));
      params.set("offset", String(opts?.offset ?? pagination.offset));
    }

    if (level !== "all") params.set("level", level);
    if (source !== "all") params.set("source", source);
    if (area !== "all") params.set("area", area);
    if (resolved !== "all") params.set("resolved", resolved);
    if (search.trim()) params.set("search", search.trim());

    return params.toString();
  }

  async function loadRows(nextOffset?: number) {
    setLoading(true);
    setErr(null);

    try {
      const ok = await ensureAdminAccess();
      if (!ok) return;

      const res = await fetch(`/api/admin/errors?${buildQueryString({ offset: nextOffset })}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load errors.");
      }

      setRows(json.rows || []);
      setPagination(json.pagination || { limit: 50, offset: 0, total: 0 });
    } catch (e: any) {
      setErr(e?.message || "Failed to load errors.");
      await logError("admin_errors_load_failed", {
        source: "admin",
        area: "admin",
        path: "/admin/errors",
        code: "admin_errors_load_failed",
        details: {
          message: e?.message || "Unknown error",
        },
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadSummary() {
    setSummaryLoading(true);

    try {
      const ok = await ensureAdminAccess();
      if (!ok) return;

      const res = await fetch(`/api/admin/errors?${buildQueryString({ summary: true })}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load error summary.");
      }

      setSummary(json.summary || null);
    } catch (e: any) {
      await logError("admin_errors_summary_load_failed", {
        source: "admin",
        area: "admin",
        path: "/admin/errors",
        code: "admin_errors_summary_load_failed",
        details: {
          message: e?.message || "Unknown error",
        },
      });
    } finally {
      setSummaryLoading(false);
    }
  }

  async function loadPage(nextOffset?: number) {
    await Promise.all([loadRows(nextOffset), loadSummary()]);
  }

  useEffect(() => {
    void loadPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, source, area, resolved, search]);

  async function toggleResolved(row: ErrorLogRow) {
    setBusyId(row.id);
    setErr(null);

    try {
      const res = await fetch("/api/admin/errors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          resolved: !row.resolved_at,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to update error state.");
      }

      await loadPage(pagination.offset);
    } catch (e: any) {
      setErr(e?.message || "Failed to update error.");
      await logError("admin_error_resolve_failed", {
        source: "admin",
        area: "admin",
        path: "/admin/errors",
        code: "admin_error_resolve_failed",
        details: {
          errorId: row.id,
          message: e?.message || "Unknown error",
        },
      });
    } finally {
      setBusyId(null);
    }
  }

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil((pagination.total || 0) / pagination.limit));
  }, [pagination.limit, pagination.total]);

  const currentPage = useMemo(() => {
    return Math.floor(pagination.offset / pagination.limit) + 1;
  }, [pagination.limit, pagination.offset]);

  const topAreas = useMemo(() => {
    if (!summary?.byArea) return [];
    return Object.entries(summary.byArea)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [summary]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827]">Error Logs</h1>
            <p className="mt-2 text-sm text-[#4B5563]">
              Operational error visibility for admin review and resolution.
            </p>
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
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total errors"
          value={summaryLoading ? "…" : summary?.total ?? 0}
        />
        <StatCard
          label="Unresolved"
          value={summaryLoading ? "…" : summary?.unresolvedCount ?? 0}
        />
        <StatCard
          label="Critical"
          value={summaryLoading ? "…" : summary?.criticalCount ?? 0}
        />
        <StatCard
          label="Top area"
          value={summaryLoading ? "…" : topAreas[0]?.[0] ?? "—"}
          hint={
            summaryLoading
              ? undefined
              : topAreas[0] ? `${topAreas[0][1]} logs` : "No data"
          }
        />
      </section>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Filters</h2>
            <p className="mt-1 text-sm text-[#4B5563]">
              Narrow the list by severity, source, area, status, or search.
            </p>
          </div>

          <div className="grid gap-3 xl:grid-cols-[2fr_repeat(4,1fr)_auto]">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search message, path, code, fingerprint"
              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            />

            <Select
              value={level}
              onChange={setLevel}
              options={[
                { value: "all", label: "All levels" },
                { value: "info", label: "Info" },
                { value: "warning", label: "Warning" },
                { value: "error", label: "Error" },
                { value: "critical", label: "Critical" },
              ]}
            />

            <Select
              value={source}
              onChange={setSource}
              options={[
                { value: "all", label: "All sources" },
                { value: "frontend", label: "Frontend" },
                { value: "api", label: "API" },
                { value: "db", label: "DB" },
                { value: "auth", label: "Auth" },
                { value: "server", label: "Server" },
                { value: "admin", label: "Admin" },
              ]}
            />

            <Select
              value={area}
              onChange={setArea}
              options={[
                { value: "all", label: "All areas" },
                { value: "auth", label: "Auth" },
                { value: "admin", label: "Admin" },
                { value: "contractor", label: "Contractor" },
                { value: "customer", label: "Customer" },
                { value: "jobs", label: "Jobs" },
                { value: "bids", label: "Bids" },
                { value: "documents", label: "Documents" },
              ]}
            />

            <Select
              value={resolved}
              onChange={setResolved}
              options={[
                { value: "all", label: "All statuses" },
                { value: "false", label: "Unresolved" },
                { value: "true", label: "Resolved" },
              ]}
            />

            <button
              type="button"
              onClick={() => {
                setPagination((prev) => ({ ...prev, offset: 0 }));
                setSearch(searchInput.trim());
              }}
              className="rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
            >
              Apply
            </button>
          </div>
        </div>
      </section>

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Errors</h2>
            <p className="mt-1 text-sm text-[#4B5563]">
              {loading
                ? "Loading logs..."
                : `${pagination.total} total logs, page ${currentPage} of ${totalPages}`}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
              Loading error logs...
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
              No error logs found for the current filters.
            </div>
          ) : (
            rows.map((row) => {
              const expanded = expandedId === row.id;
              const detailsString = row.details
                ? JSON.stringify(row.details, null, 2)
                : null;

              return (
                <article
                  key={row.id}
                  className="rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <LevelBadge level={row.level} />
                        <StatusBadge resolvedAt={row.resolved_at} />
                        {row.source ? (
                          <span className="inline-flex rounded-full border border-[#D9E2EC] bg-white px-2.5 py-1 text-xs font-medium text-[#4B5563]">
                            {row.source}
                          </span>
                        ) : null}
                        {row.area ? (
                          <span className="inline-flex rounded-full border border-[#D9E2EC] bg-white px-2.5 py-1 text-xs font-medium text-[#4B5563]">
                            {row.area}
                          </span>
                        ) : null}
                        {row.code ? (
                          <span className="inline-flex rounded-full border border-[#D9E2EC] bg-white px-2.5 py-1 text-xs font-medium text-[#4B5563]">
                            {row.code}
                          </span>
                        ) : null}
                        {row.status_code ? (
                          <span className="inline-flex rounded-full border border-[#D9E2EC] bg-white px-2.5 py-1 text-xs font-medium text-[#4B5563]">
                            HTTP {row.status_code}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 break-words text-sm font-semibold text-[#111827]">
                        {row.message}
                      </div>

                      <div className="mt-3 grid gap-2 text-xs text-[#6B7280] md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <span className="font-medium text-[#111827]">Created:</span>{" "}
                          {formatDate(row.created_at)}
                        </div>
                        <div>
                          <span className="font-medium text-[#111827]">Resolved:</span>{" "}
                          {formatDate(row.resolved_at)}
                        </div>
                        <div className="break-all">
                          <span className="font-medium text-[#111827]">Path:</span>{" "}
                          {row.path || "—"}
                        </div>
                        <div className="break-all">
                          <span className="font-medium text-[#111827]">
                            Fingerprint:
                          </span>{" "}
                          {row.fingerprint || "—"}
                        </div>
                      </div>

                      {expanded ? (
                        <div className="mt-4 space-y-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-2xl border border-[#D9E2EC] bg-white p-4">
                              <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                                Metadata
                              </div>
                              <div className="mt-3 space-y-2 text-sm text-[#111827]">
                                <div className="break-all">
                                  <span className="font-medium">ID:</span> {row.id}
                                </div>
                                <div className="break-all">
                                  <span className="font-medium">User ID:</span>{" "}
                                  {row.user_id || "—"}
                                </div>
                                <div>
                                  <span className="font-medium">Role:</span>{" "}
                                  {row.role || "—"}
                                </div>
                                <div className="break-all">
                                  <span className="font-medium">Resolved by:</span>{" "}
                                  {row.resolved_by || "—"}
                                </div>
                              </div>
                            </div>

                            <div className="rounded-2xl border border-[#D9E2EC] bg-white p-4">
                              <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                                Details
                              </div>
                              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs text-[#111827]">
                                {detailsString || "No details"}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId((prev) => (prev === row.id ? null : row.id))
                        }
                        className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                      >
                        {expanded ? "Hide details" : "Show details"}
                      </button>

                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => toggleResolved(row)}
                        className={`rounded-xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          row.resolved_at
                            ? "border border-[#D9E2EC] bg-white text-[#111827] hover:bg-[#F8FAFC]"
                            : "bg-[#1F6FB5] text-white hover:bg-[#0A2E5C]"
                        }`}
                      >
                        {busyId === row.id
                          ? "Saving..."
                          : row.resolved_at
                          ? "Mark unresolved"
                          : "Mark resolved"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {!loading && rows.length > 0 ? (
          <div className="mt-6 flex flex-col gap-3 border-t border-[#D9E2EC] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-[#4B5563]">
              Showing {pagination.offset + 1}–
              {Math.min(pagination.offset + pagination.limit, pagination.total)} of{" "}
              {pagination.total}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.offset === 0}
                onClick={() => {
                  const nextOffset = Math.max(
                    pagination.offset - pagination.limit,
                    0
                  );
                  setPagination((prev) => ({ ...prev, offset: nextOffset }));
                  void loadPage(nextOffset);
                }}
                className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={pagination.offset + pagination.limit >= pagination.total}
                onClick={() => {
                  const nextOffset = pagination.offset + pagination.limit;
                  setPagination((prev) => ({ ...prev, offset: nextOffset }));
                  void loadPage(nextOffset);
                }}
                className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}