"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { withErrorLogging } from "../../../lib/errors/withErrorLogging";
import { refreshAdminSidebar } from "../../../lib/admin/refreshAdminSidebar";

type CustomerApprovalRow = {
  id: string;
  company_name: string | null;
  status: string | null;
  onboarding_status: string | null;
  created_at: string;
  owner_user_id: string | null;
};

type CustomerApprovalsResponse = {
  rows?: CustomerApprovalRow[];
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function StatusBadge({
  status,
  tone = "neutral",
}: {
  status: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const styles =
    tone === "success"
      ? "border-green-200 bg-green-50 text-green-700"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "info"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-[#D9E2EC] bg-[#F8FAFC] text-[#4B5563]";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${styles}`}
    >
      {status}
    </span>
  );
}

async function fetchJsonOrThrow<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    cache: "no-store",
    ...init,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error("admin_customer_approvals_request_failed");
  }

  return (data ?? {}) as T;
}

export default function AdminCustomerApprovalsPage() {
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<CustomerApprovalRow[]>([]);

  async function loadPage() {
    setLoading(true);
    setErr(null);

    try {
      const data = await withErrorLogging(
        () =>
          fetchJsonOrThrow<CustomerApprovalsResponse>(
            "/api/admin/customer-approvals",
            {
              method: "GET",
            }
          ),
        {
          message: "admin_customer_approvals_load_failed",
          code: "admin_customer_approvals_load_failed",
          source: "frontend",
          area: "admin",
          path: "/admin/customer-approvals",
          role: "admin",
        }
      );

      setRows(data.rows || []);
    } catch {
      setErr("Unable to load customer approvals.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();

    let reloadTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        void loadPage();
      }, 300);
    };

    const customersChannel = supabase
      .channel("admin-customer-approvals-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customers" },
        () => scheduleReload()
      )
      .subscribe();

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      void supabase.removeChannel(customersChannel);
    };
  }, []);

  async function approveCustomer(customerId: string) {
    setBusyId(customerId);
    setErr(null);

    try {
      await withErrorLogging(
        () =>
          fetchJsonOrThrow<{ ok: true }>(
            `/api/admin/customer-approvals/${customerId}/approve`,
            {
              method: "POST",
            }
          ),
        {
          message: "admin_customer_approve_failed",
          code: "admin_customer_approve_failed",
          source: "frontend",
          area: "admin",
          path: "/admin/customer-approvals",
          role: "admin",
          details: { customerId },
        }
      );

      await loadPage();
      refreshAdminSidebar();
    } catch {
      setErr("Unable to approve customer.");
    } finally {
      setBusyId(null);
    }
  }

  async function returnToDraft(customerId: string) {
    setBusyId(customerId);
    setErr(null);

    try {
      await withErrorLogging(
        () =>
          fetchJsonOrThrow<{ ok: true }>(
            `/api/admin/customer-approvals/${customerId}/return-to-draft`,
            {
              method: "POST",
            }
          ),
        {
          message: "admin_customer_return_to_draft_failed",
          code: "admin_customer_return_to_draft_failed",
          source: "frontend",
          area: "admin",
          path: "/admin/customer-approvals",
          role: "admin",
          details: { customerId },
        }
      );

      await loadPage();
      refreshAdminSidebar();
    } catch {
      setErr("Unable to return customer to draft.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827]">
              Customer approvals
            </h1>
            <p className="mt-2 text-sm text-[#4B5563]">
              Review submitted customer accounts and approve them for platform access.
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
          >
            Back to admin
          </Link>
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading customer approvals...</p>
        </section>
      ) : null}

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      {!loading && rows.length === 0 ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">
            No submitted customers waiting for approval.
          </p>
        </section>
      ) : null}

      {!loading && rows.length > 0 ? (
        <section className="grid gap-4">
          {rows.map((row) => {
            const isBusy = busyId === row.id;

            return (
              <article
                key={row.id}
                className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-[#111827]">
                      {row.company_name || "Unnamed company"}
                    </h2>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusBadge
                        status={row.onboarding_status || "unknown"}
                        tone="warning"
                      />
                      <StatusBadge
                        status={row.status || "unknown"}
                        tone="info"
                      />
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                          Created
                        </div>
                        <div className="mt-1 text-sm font-medium text-[#111827]">
                          {formatDate(row.created_at)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                          Status
                        </div>
                        <div className="mt-1 text-sm font-medium text-[#111827]">
                          {row.status || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                          Owner user
                        </div>
                        <div className="mt-1 break-all text-sm font-medium text-[#111827]">
                          {row.owner_user_id || "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void approveCustomer(row.id)}
                      className="rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isBusy ? "Processing..." : "Approve"}
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void returnToDraft(row.id)}
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Return to draft
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}