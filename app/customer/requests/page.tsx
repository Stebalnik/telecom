"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile } from "../../../lib/profile";
import { getMyCustomer } from "../../../lib/customers";
import {
  customerReviewContractorRequest,
  customerStartOrGetRequestThread,
  listCustomerPendingContractorRequests,
  listRequestThreadMessages,
  type CustomerPendingContractorRequestRow,
  type RequestThreadMessage,
} from "../../../lib/contractor";

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
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

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${styles}`}>
      {normalized === "approved"
        ? "Approved"
        : normalized === "rejected"
        ? "Rejected"
        : "Pending"}
    </span>
  );
}

function CompactPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#D9E2EC] bg-[#F8FAFC] px-3 py-1 text-xs font-medium text-[#111827]">
      {children}
    </span>
  );
}

export default function CustomerRequestsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState<string>("");
  const [rows, setRows] = useState<CustomerPendingContractorRequestRow[]>([]);

  const [questionDraft, setQuestionDraft] = useState<Record<string, string>>({});
  const [messagesByThread, setMessagesByThread] = useState<Record<string, RequestThreadMessage[]>>({});

  const pendingCount = useMemo(
    () => rows.filter((x) => x.status === "pending").length,
    [rows]
  );

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const profile = await getMyProfile();
      if (!profile) {
        router.replace("/login");
        return;
      }
      if (profile.role !== "customer") {
        router.replace("/dashboard");
        return;
      }

      const customer = await getMyCustomer();
      if (!customer?.id) {
        throw new Error("Customer profile not found.");
      }

      setCustomerId(customer.id);

      const list = await listCustomerPendingContractorRequests(customer.id);
      setRows(list);

      const threadIds = list
        .map((x) => x.thread_id)
        .filter((x): x is string => Boolean(x));

      const nextMessages: Record<string, RequestThreadMessage[]> = {};
      for (const threadId of threadIds) {
        nextMessages[threadId] = await listRequestThreadMessages(threadId);
      }
      setMessagesByThread(nextMessages);
    } catch (e: any) {
      setErr(e.message || "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDecision(
    contractorCompanyId: string,
    decision: "approved" | "rejected"
  ) {
    if (!customerId) return;

    const key = `${decision}:${contractorCompanyId}`;
    setBusyKey(key);
    setErr(null);

    try {
      await customerReviewContractorRequest({
        customerId,
        contractorCompanyId,
        decision,
      });
      await load();
    } catch (e: any) {
      setErr(e.message || "Failed to update request.");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleAskQuestion(row: CustomerPendingContractorRequestRow) {
    if (!customerId) return;

    const text = (questionDraft[row.contractor_company_id] || "").trim();
    if (!text) {
      setErr("Enter a question first.");
      return;
    }

    const key = `question:${row.contractor_company_id}`;
    setBusyKey(key);
    setErr(null);

    try {
      await customerStartOrGetRequestThread({
        customerId,
        contractorCompanyId: row.contractor_company_id,
        firstMessage: text,
      });

      setQuestionDraft((prev) => ({
        ...prev,
        [row.contractor_company_id]: "",
      }));

      await load();
    } catch (e: any) {
      setErr(e.message || "Failed to send question.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#111827]">
                Requests
              </h1>
              <p className="mt-2 text-sm text-[#4B5563]">
                Review contractor approval requests, see compact contractor info,
                and ask clarifying questions before approval.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/customer"
                className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
              >
                Back to customer
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
              <div className="text-sm text-[#4B5563]">Pending contractor requests</div>
              <div className="mt-2 text-2xl font-semibold text-[#111827]">
                {pendingCount}
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm text-sm text-[#4B5563]">
            Loading requests...
          </section>
        ) : null}

        {err ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {err}
          </section>
        ) : null}

        {!loading && rows.length === 0 ? (
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm text-sm text-[#4B5563]">
            No pending contractor requests.
          </section>
        ) : null}

        {!loading && rows.length > 0 ? (
          <div className="grid gap-4">
            {rows.map((row) => {
              const threadMessages = row.thread_id ? messagesByThread[row.thread_id] || [] : [];
              const approveBusy = busyKey === `approved:${row.contractor_company_id}`;
              const rejectBusy = busyKey === `rejected:${row.contractor_company_id}`;
              const questionBusy = busyKey === `question:${row.contractor_company_id}`;

              return (
                <article
                  key={row.contractor_company_id}
                  className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-semibold text-[#111827]">
                          {row.contractor_legal_name || "Unnamed contractor"}
                        </h2>
                        {row.contractor_dba_name ? (
                          <CompactPill>DBA: {row.contractor_dba_name}</CompactPill>
                        ) : null}
                        <StatusBadge status={row.status} />
                      </div>

                      <div className="mt-2 text-sm text-[#4B5563]">
                        {row.headline || "No contractor headline provided."}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <CompactPill>
                          Market: {row.home_market || "—"}
                        </CompactPill>

                        <CompactPill>
                          Teams available: {row.available_teams_count}
                        </CompactPill>

                        <CompactPill>
                          Approved cert docs: {row.approved_cert_count}
                        </CompactPill>

                        <CompactPill>
                          Certified team members: {row.approved_team_members_count}
                        </CompactPill>

                        <CompactPill>
                          Company status: {row.contractor_status || "—"}
                        </CompactPill>

                        <CompactPill>
                          Onboarding: {row.contractor_onboarding_status || "—"}
                        </CompactPill>
                      </div>

                      {row.insurance_types?.length ? (
                        <div className="mt-3 text-sm text-[#111827]">
                          <span className="font-medium">Insurance:</span>{" "}
                          {row.insurance_types.join(", ")}
                        </div>
                      ) : (
                        <div className="mt-3 text-sm text-[#6B7280]">
                          Insurance: none approved
                        </div>
                      )}

                      <div className="mt-3 text-xs text-[#6B7280]">
                        Requested: {formatDateTime(row.approval_requested_at)}
                      </div>

                      {row.cooldown_until ? (
                        <div className="mt-1 text-xs text-[#6B7280]">
                          Cooldown until: {formatDateTime(row.cooldown_until)}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={approveBusy || rejectBusy || questionBusy}
                        onClick={() =>
                          handleDecision(row.contractor_company_id, "approved")
                        }
                        className="rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {approveBusy ? "Approving..." : "Approve"}
                      </button>

                      <button
                        type="button"
                        disabled={approveBusy || rejectBusy || questionBusy}
                        onClick={() =>
                          handleDecision(row.contractor_company_id, "rejected")
                        }
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {rejectBusy ? "Rejecting..." : "Reject"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4">
                    <div className="text-sm font-semibold text-[#111827]">
                      Ask question
                    </div>
                    <p className="mt-1 text-sm text-[#4B5563]">
                      Customer can initiate this conversation. Contractor can reply after the thread exists.
                    </p>

                    <div className="mt-3 flex flex-col gap-3 lg:flex-row">
                      <textarea
                        className="min-h-[96px] w-full rounded-2xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                        placeholder="Ask for missing details, coverage clarification, team composition, or supporting information."
                        value={questionDraft[row.contractor_company_id] || ""}
                        onChange={(e) =>
                          setQuestionDraft((prev) => ({
                            ...prev,
                            [row.contractor_company_id]: e.target.value,
                          }))
                        }
                      />

                      <div>
                        <button
                          type="button"
                          onClick={() => handleAskQuestion(row)}
                          disabled={approveBusy || rejectBusy || questionBusy}
                          className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {questionBusy ? "Sending..." : row.has_thread ? "Send message" : "Ask question"}
                        </button>
                      </div>
                    </div>

                    {threadMessages.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {threadMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`rounded-2xl border p-3 text-sm ${
                              msg.sender_role === "customer"
                                ? "border-blue-200 bg-blue-50 text-[#0A2E5C]"
                                : "border-[#D9E2EC] bg-white text-[#111827]"
                            }`}
                          >
                            <div className="font-medium">
                              {msg.sender_role === "customer" ? "Customer" : "Contractor"}
                            </div>
                            <div className="mt-1 whitespace-pre-wrap">{msg.body}</div>
                            <div className="mt-2 text-xs text-[#6B7280]">
                              {formatDateTime(msg.created_at)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </main>
  );
}