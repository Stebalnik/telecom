"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { withErrorLogging } from "../../../lib/errors/withErrorLogging";

type FeedbackItem = {
  id: string;
  created_at: string;
  updated_at?: string;
  role?: string | null;
  source?: string;
  category?: string;
  subject?: string;
  message: string;
  priority?: string;
  status: string;
  path?: string | null;
  last_message_at?: string | null;
  actor_name?: string;
  actor_type?: string;
  needs_admin_attention?: boolean;
};

type FeedbackSummary = {
  total?: number;
  newCount?: number;
  inReviewCount?: number;
  waitingForUserCount?: number;
  resolvedCount?: number;
  customerCount?: number;
  contractorCount?: number;
  publicCount?: number;
  highPriorityCount?: number;
  attentionCount?: number;
};

type AdminFeedbackResponse = {
  items?: FeedbackItem[];
  summary?: FeedbackSummary;
  error?: string;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "resolved"
      ? "border-green-200 bg-green-50 text-green-700"
      : status === "closed"
      ? "border-slate-200 bg-slate-50 text-slate-700"
      : status === "planned"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : status === "waiting_for_user"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : status === "in_review"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-[#BFDBFE] bg-[#EAF4FF] text-[#0A2E5C]";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${styles}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [summary, setSummary] = useState<FeedbackSummary>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "customer" | "contractor" | "public">("all");

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const data = await withErrorLogging(
        async () => {
          const res = await fetch("/api/admin/feedback", {
            method: "GET",
            cache: "no-store",
          });

          const json = (await res.json().catch(() => ({}))) as AdminFeedbackResponse;

          if (!res.ok) {
            throw new Error(json?.error || "admin_feedback_load_failed");
          }

          return json;
        },
        {
          message: "admin_feedback_load_failed",
          code: "admin_feedback_load_failed",
          source: "frontend",
          area: "admin",
          path: "/admin/feedback",
          role: "admin",
        }
      );

      setItems(data.items || []);
      setSummary(data.summary || {});
    } catch {
      setErr("Unable to load feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filter === "all") return true;
      if (filter === "public") {
        return item.actor_type === "guest";
      }
      return item.actor_type === filter;
    });
  }, [items, filter]);

  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#0A2E5C]">
                Feedback Center
              </h1>
              <p className="mt-2 text-sm text-[#4B5563]">
                Review platform feedback from customers, contractors, and public users.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin"
                className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#0A2E5C] transition hover:bg-[#F8FAFC]"
              >
                Back to admin
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
            <div className="text-sm text-[#4B5563]">Total</div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {summary.total ?? 0}
            </div>
          </div>

          <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
            <div className="text-sm text-[#4B5563]">Needs attention</div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {summary.attentionCount ?? 0}
            </div>
          </div>

          <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
            <div className="text-sm text-[#4B5563]">Customers</div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {summary.customerCount ?? 0}
            </div>
          </div>

          <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
            <div className="text-sm text-[#4B5563]">Contractors</div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {summary.contractorCount ?? 0}
            </div>
          </div>

          <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
            <div className="text-sm text-[#4B5563]">Public / guest</div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {summary.publicCount ?? 0}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0A2E5C]">Feedback list</h2>
              <p className="mt-1 text-sm text-[#4B5563]">
                Filter by sender type and open a feedback thread for details.
              </p>
            </div>

            <div>
              <select
                value={filter}
                onChange={(e) =>
                  setFilter(
                    e.target.value as "all" | "customer" | "contractor" | "public"
                  )
                }
                className="w-full rounded-2xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20 lg:w-[220px]"
              >
                <option value="all">All</option>
                <option value="customer">Customers</option>
                <option value="contractor">Contractors</option>
                <option value="public">Public / guest</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
              Loading feedback...
            </div>
          ) : err ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {err}
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
              No feedback found for this filter.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {filtered.map((item) => (
                <Link
                  key={item.id}
                  href={`/admin/feedback/${item.id}`}
                  className="block rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm transition hover:bg-[#F8FAFC]"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-[#111827]">
                          {item.subject || "Untitled feedback"}
                        </h3>
                        <StatusBadge status={item.status} />
                        {item.needs_admin_attention ? (
                          <span className="inline-flex rounded-full bg-[#2EA3FF] px-2.5 py-1 text-xs font-semibold text-white">
                            Needs attention
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
                        {item.actor_name ? (
                          <span className="rounded-full border border-[#D9E2EC] bg-[#F8FAFC] px-2 py-1 font-medium text-[#111827]">
                            {item.actor_name}
                          </span>
                        ) : null}
                        {item.actor_type ? (
                          <span className="rounded-full border border-[#D9E2EC] bg-[#F8FAFC] px-2 py-1">
                            {item.actor_type}
                          </span>
                        ) : null}
                        {item.category ? (
                          <span className="rounded-full border border-[#D9E2EC] bg-[#F8FAFC] px-2 py-1">
                            {item.category.replaceAll("_", " ")}
                          </span>
                        ) : null}
                        {item.priority ? (
                          <span className="rounded-full border border-[#D9E2EC] bg-[#F8FAFC] px-2 py-1">
                            priority: {item.priority}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 line-clamp-3 text-sm text-[#111827]">
                        {item.message}
                      </div>

                      {item.path ? (
                        <div className="mt-3 text-xs text-[#6B7280]">
                          Path: {item.path}
                        </div>
                      ) : null}
                    </div>

                    <div className="text-xs text-[#6B7280] lg:text-right">
                      <div>Created: {formatDate(item.created_at)}</div>
                      <div>Last activity: {formatDate(item.last_message_at)}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}