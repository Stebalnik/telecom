"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  applyToCustomer,
  listCustomerRequirementSummaries,
  listMyCustomerApplications,
  normalizeCustomerRelation,
  searchCustomers,
  type CustomerMini,
  type CustomerRequirementSummary,
  type MyCustomerApplicationRow,
} from "../../../lib/contractor";
import { normalizeError } from "../../../lib/errors/normalizeError";
import { withErrorLogging } from "../../../lib/errors/withErrorLogging";
import { getMyProfile } from "../../../lib/profile";
import { supabase } from "../../../lib/supabaseClient";

function getSafeCustomersErrorMessage(
  error: unknown,
  fallback: string
): string {
  const normalized = normalizeError(error);
  const code = String(normalized.code || "").toLowerCase();
  const message = String(normalized.message || "").toLowerCase();

  if (code.includes("not_logged_in") || message.includes("not authenticated")) {
    return "Your session has expired. Please log in again.";
  }

  if (code.includes("duplicate")) {
    return "This request already exists.";
  }

  return fallback;
}

function StatusBadge({
  status,
}: {
  status: "pending" | "approved" | "rejected" | string;
}) {
  const normalized = (status || "").toLowerCase();

  const styles =
    normalized === "approved"
      ? "border-green-200 bg-green-50 text-green-700"
      : normalized === "rejected"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  const label =
    normalized === "approved"
      ? "Approved"
      : normalized === "rejected"
      ? "Rejected"
      : "Pending";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${styles}`}
    >
      {label}
    </span>
  );
}

function EmptyState({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-6 text-center">
      <div className="text-sm font-medium text-[#111827]">{title}</div>
      <div className="mt-2 text-sm text-[#4B5563]">{text}</div>
    </div>
  );
}

function RequirementPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#D9E2EC] bg-[#F8FAFC] px-3 py-1 text-xs font-medium text-[#111827]">
      {children}
    </span>
  );
}

export default function ContractorCustomersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CustomerMini[]>([]);

  const [apps, setApps] = useState<MyCustomerApplicationRow[]>([]);
  const [requirementsByCustomerId, setRequirementsByCustomerId] = useState<
    Record<string, CustomerRequirementSummary>
  >({});

  const [applyingCustomerId, setApplyingCustomerId] = useState<string | null>(
    null
  );

  async function refreshApplications() {
    const rows = await withErrorLogging(
      () => listMyCustomerApplications(),
      {
        message: "contractor_customers_load_applications_failed",
        code: "contractor_customers_load_applications_failed",
        source: "frontend",
        area: "contractor",
        path: "/contractor/customers",
      }
    );

    setApps(rows);

    const summaries = await withErrorLogging(
      () => listCustomerRequirementSummaries(rows.map((row) => row.customer_id)),
      {
        message: "contractor_customers_load_requirement_summaries_failed",
        code: "contractor_customers_load_requirement_summaries_failed",
        source: "frontend",
        area: "contractor",
        path: "/contractor/customers",
        details: {
          customerCount: rows.length,
        },
      }
    );

    setRequirementsByCustomerId(summaries);
  }

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setErr(null);

      try {
        const sessionResult = await withErrorLogging(
          async () => {
            const result = await supabase.auth.getSession();

            if (result.error) {
              throw result.error;
            }

            return result;
          },
          {
            message: "contractor_customers_session_check_failed",
            code: "contractor_customers_session_check_failed",
            source: "frontend",
            area: "auth",
            path: "/contractor/customers",
          }
        );

        if (!sessionResult.data.session?.user) {
          router.replace("/login");
          return;
        }

        const profile = await withErrorLogging(() => getMyProfile(), {
          message: "contractor_customers_get_profile_failed",
          code: "contractor_customers_get_profile_failed",
          source: "frontend",
          area: "auth",
          path: "/contractor/customers",
        });

        if (!profile || profile.role !== "contractor") {
          router.replace("/dashboard");
          return;
        }

        if (!active) return;
        await refreshApplications();
      } catch (error) {
        if (!active) return;

        setErr(
          getSafeCustomersErrorMessage(
            error,
            "Unable to load this page. Please try again."
          )
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [router]);

  async function runSearch() {
    const trimmed = q.trim();

    if (!trimmed) {
      setResults([]);
      return;
    }

    setErr(null);
    setSearching(true);

    try {
      const found = await withErrorLogging(() => searchCustomers(trimmed), {
        message: "contractor_customers_search_failed",
        code: "contractor_customers_search_failed",
        source: "frontend",
        area: "contractor",
        path: "/contractor/customers",
        details: {
          query: trimmed,
        },
      });

      setResults(found);
    } catch (error) {
      setErr(
        getSafeCustomersErrorMessage(error, "Unable to search customers.")
      );
    } finally {
      setSearching(false);
    }
  }

  async function handleApply(customerId: string) {
    setErr(null);
    setApplyingCustomerId(customerId);

    try {
      await withErrorLogging(() => applyToCustomer(customerId), {
        message: "contractor_customers_apply_failed",
        code: "contractor_customers_apply_failed",
        source: "frontend",
        area: "contractor",
        path: "/contractor/customers",
        details: {
          customerId,
        },
      });

      await refreshApplications();
    } catch (error) {
      setErr(
        getSafeCustomersErrorMessage(
          error,
          "Unable to submit your application. Please try again."
        )
      );
    } finally {
      setApplyingCustomerId(null);
    }
  }

  function statusFor(customerId: string) {
    const row = apps.find((x) => x.customer_id === customerId);
    return row?.status ?? null;
  }

  const pendingCount = useMemo(
    () => apps.filter((x) => x.status === "pending").length,
    [apps]
  );

  const approvedCount = useMemo(
    () => apps.filter((x) => x.status === "approved").length,
    [apps]
  );

  const rejectedCount = useMemo(
    () => apps.filter((x) => x.status === "rejected").length,
    [apps]
  );

  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt="LEOTEOR"
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded object-contain"
                />
                <span className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
                  Contractor workspace
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#0A2E5C]">
                Customer approvals
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
                Search for customers, submit approval requests, and track the status
                of your applications.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/contractor"
                className="inline-flex items-center justify-center rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-semibold text-[#0A2E5C] transition hover:bg-[#F4F8FC]"
              >
                Back to contractor
              </Link>

              <Link
                href="/contractor/jobs"
                className="inline-flex items-center justify-center rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0A2E5C]"
              >
                Browse jobs
              </Link>
            </div>
          </div>

          {err ? (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
            <div className="text-sm text-[#4B5563]">Total applications</div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {apps.length}
            </div>
          </div>

          <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
            <div className="text-sm text-[#4B5563]">Pending</div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {pendingCount}
            </div>
          </div>

          <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
            <div className="text-sm text-[#4B5563]">Approved</div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {approvedCount}
            </div>
          </div>

          <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
            <div className="text-sm text-[#4B5563]">Rejected</div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {rejectedCount}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-[#111827]">
              Find a customer
            </h2>
            <p className="text-sm text-[#4B5563]">
              Search by company name and submit a request to work with that customer.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <input
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              placeholder="Search by customer name"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && q.trim() && !searching) {
                  void runSearch();
                }
              }}
            />

            <button
              type="button"
              onClick={() => void runSearch()}
              disabled={!q.trim() || searching}
              className="inline-flex items-center justify-center rounded-xl bg-[#2EA3FF] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          <div className="mt-5">
            {searching ? (
              <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                Searching customers...
              </div>
            ) : results.length === 0 ? (
              <EmptyState
                title="No search results yet"
                text="Enter a customer name to see matching companies."
              />
            ) : (
              <div className="grid gap-4">
                {results.map((customer) => {
                  const status = statusFor(customer.id);
                  const isBusy = applyingCustomerId === customer.id;
                  const isDisabled =
                    status === "approved" || status === "pending" || isBusy;

                  return (
                    <div
                      key={customer.id}
                      className="rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="text-lg font-semibold text-[#111827]">
                            {customer.name}
                          </div>

                          {customer.description ? (
                            <div className="mt-2 text-sm leading-6 text-[#4B5563]">
                              {customer.description}
                            </div>
                          ) : null}

                          <div className="mt-3 break-all text-xs text-[#6B7280]">
                            Customer ID: {customer.id}
                          </div>
                        </div>

                        <div className="flex flex-col items-start gap-3 lg:items-end">
                          {status ? <StatusBadge status={status} /> : null}

                          <button
                            type="button"
                            onClick={() => void handleApply(customer.id)}
                            disabled={isDisabled}
                            className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                              isDisabled
                                ? "cursor-not-allowed border border-[#D9E2EC] bg-[#F8FAFC] text-[#9CA3AF]"
                                : "bg-[#2EA3FF] text-white shadow-sm hover:brightness-95"
                            }`}
                          >
                            {status === "approved"
                              ? "Approved"
                              : status === "pending"
                              ? "Applied"
                              : isBusy
                              ? "Applying..."
                              : "Apply"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-[#111827]">
              My applications
            </h2>
            <p className="text-sm text-[#4B5563]">
              Track customer approval requests submitted from your contractor account.
            </p>
          </div>

          <div className="mt-5">
            {loading ? (
              <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                Loading applications...
              </div>
            ) : apps.length === 0 ? (
              <EmptyState
                title="No applications yet"
                text="When you apply to a customer, the request will appear here."
              />
            ) : (
              <div className="grid gap-4">
                {apps.map((app) => {
                  const customer = normalizeCustomerRelation(app.customers);
                  const req = requirementsByCustomerId[app.customer_id];

                  return (
                    <div
                      key={app.customer_id}
                      className="rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="text-lg font-semibold text-[#111827]">
                            {customer?.name ?? "Customer"}
                          </div>

                          {customer?.description ? (
                            <div className="mt-2 text-sm leading-6 text-[#4B5563]">
                              {customer.description}
                            </div>
                          ) : null}

                          <div className="mt-3 flex flex-wrap gap-2">
                            {req?.insurance?.length ? (
                              <RequirementPill>
                                Insurance: {req.insurance.join(", ")}
                              </RequirementPill>
                            ) : null}

                            {req?.scopes?.length ? (
                              <RequirementPill>
                                Scopes: {req.scopes.join(", ")}
                              </RequirementPill>
                            ) : null}
                          </div>

                          <div className="mt-3 break-all text-xs text-[#6B7280]">
                            Customer ID: {app.customer_id}
                          </div>

                          <div className="mt-1 text-xs text-[#6B7280]">
                            Submitted: {new Date(app.created_at).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex items-start">
                          <StatusBadge status={app.status} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}