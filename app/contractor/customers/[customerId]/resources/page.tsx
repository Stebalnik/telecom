"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { withErrorLogging } from "../../../../../lib/errors/withErrorLogging";
import { normalizeError } from "../../../../../lib/errors/normalizeError";
import { getMyProfile } from "../../../../../lib/profile";
import { supabase } from "../../../../../lib/supabaseClient";

type ContractorResourceRow = {
  id: string;
  customer_id: string;
  title: string;
  description: string | null;
  category: string;
  file_name: string;
  revision_label: string | null;
  effective_date: string | null;
  expires_at: string | null;
  is_required: boolean;
  is_active: boolean;
  audience_scope: "all_markets" | "selected_markets";
  created_at: string;
  updated_at: string;
  is_acknowledged: boolean;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function getSafePageErrorMessage(error: unknown, fallback: string) {
  const normalized = normalizeError(error);
  const code = String(normalized.code || "");
  const message = String(normalized.message || "").toLowerCase();

  if (code.includes("not_logged_in") || message.includes("not logged in")) {
    return "Your session has expired. Please log in again.";
  }

  if (message.includes("not authenticated")) {
    return "Your session has expired. Please log in again.";
  }

  if (message.includes("access denied")) {
    return "You do not have access to this resource.";
  }

  return fallback;
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "info";
}) {
  const styles =
    tone === "success"
      ? "border-green-200 bg-green-50 text-green-700"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "info"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-[#D9E2EC] bg-[#F8FAFC] text-[#4B5563]";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${styles}`}
    >
      {children}
    </span>
  );
}

export default function ContractorCustomerResourcesPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = String(params.customerId);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [ackId, setAckId] = useState<string | null>(null);
  const [rows, setRows] = useState<ContractorResourceRow[]>([]);

  async function getAccessToken() {
    const sessionResult = await supabase.auth.getSession();

    if (sessionResult.error) {
      throw sessionResult.error;
    }

    const accessToken = sessionResult.data.session?.access_token;

    if (!accessToken) {
      throw new Error("Not logged in.");
    }

    return accessToken;
  }

  async function loadPage() {
    setLoading(true);
    setErr(null);

    try {
      const profile = await withErrorLogging(
        () => getMyProfile(),
        {
          message: "contractor_customer_resources_load_profile_failed",
          code: "contractor_customer_resources_load_profile_failed",
          source: "frontend",
          area: "contractor",
          path: `/contractor/customers/${customerId}/resources`,
          details: {
            customerId,
          },
        }
      );

      if (!profile) {
        router.replace("/login");
        return;
      }

      if (profile.role !== "contractor") {
        router.replace("/dashboard");
        return;
      }

      const data = await withErrorLogging(
        async () => {
          const result = await supabase.rpc(
            "list_customer_resources_for_contractor",
            {
              p_customer_id: customerId,
            }
          );

          if (result.error) {
            throw result.error;
          }

          return (result.data ?? []) as ContractorResourceRow[];
        },
        {
          message: "contractor_customer_resources_load_failed",
          code: "contractor_customer_resources_load_failed",
          source: "frontend",
          area: "contractor",
          path: `/contractor/customers/${customerId}/resources`,
          details: {
            customerId,
          },
        }
      );

      setRows(data);
    } catch (error) {
      setErr(
        getSafePageErrorMessage(
          error,
          "Unable to load resources. Please try again."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function openResource(resourceId: string) {
    setErr(null);
    setOpeningId(resourceId);

    try {
      const accessToken = await withErrorLogging(
        () => getAccessToken(),
        {
          message: "contractor_customer_resource_session_failed",
          code: "contractor_customer_resource_session_failed",
          source: "frontend",
          area: "contractor",
          path: `/contractor/customers/${customerId}/resources`,
          details: {
            customerId,
            resourceId,
            action: "open",
          },
        }
      );

      const json = await withErrorLogging(
        async () => {
          const res = await fetch(
            `/api/customer/resources/file-url?resourceId=${encodeURIComponent(resourceId)}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          const payload = await res.json();

          if (!res.ok) {
            throw new Error(payload?.error || "Failed to open resource.");
          }

          if (!payload?.url) {
            throw new Error("Resource URL was not returned.");
          }

          return payload as { url: string };
        },
        {
          message: "contractor_customer_resource_open_failed",
          code: "contractor_customer_resource_open_failed",
          source: "frontend",
          area: "contractor",
          path: `/contractor/customers/${customerId}/resources`,
          details: {
            customerId,
            resourceId,
          },
        }
      );

      window.open(json.url, "_blank", "noopener,noreferrer");
      await loadPage();
    } catch (error) {
      setErr(
        getSafePageErrorMessage(
          error,
          "Unable to open resource. Please try again."
        )
      );
    } finally {
      setOpeningId(null);
    }
  }

  async function acknowledge(resourceId: string) {
    setErr(null);
    setAckId(resourceId);

    try {
      const accessToken = await withErrorLogging(
        () => getAccessToken(),
        {
          message: "contractor_customer_resource_ack_session_failed",
          code: "contractor_customer_resource_ack_session_failed",
          source: "frontend",
          area: "contractor",
          path: `/contractor/customers/${customerId}/resources`,
          details: {
            customerId,
            resourceId,
            action: "acknowledge",
          },
        }
      );

      await withErrorLogging(
        async () => {
          const res = await fetch("/api/customer/resources/acknowledge", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ resourceId }),
          });

          const payload = await res.json();

          if (!res.ok) {
            throw new Error(payload?.error || "Failed to acknowledge resource.");
          }

          return payload;
        },
        {
          message: "contractor_customer_resource_acknowledge_failed",
          code: "contractor_customer_resource_acknowledge_failed",
          source: "frontend",
          area: "contractor",
          path: `/contractor/customers/${customerId}/resources`,
          details: {
            customerId,
            resourceId,
          },
        }
      );

      await loadPage();
    } catch (error) {
      setErr(
        getSafePageErrorMessage(
          error,
          "Unable to acknowledge resource. Please try again."
        )
      );
    } finally {
      setAckId(null);
    }
  }

  useEffect(() => {
    void loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#0A2E5C]">
              Customer Resources
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
              Standards, training materials, safety notes, and work instructions
              available to your approved contractor company.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/contractor/customers"
              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              Back to Customers
            </Link>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading resources...</p>
        </section>
      ) : null}

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      {!loading && !err && rows.length === 0 ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">
            No resources available for your company in this customer workspace.
          </p>
        </section>
      ) : null}

      {!loading && !err && rows.length > 0 ? (
        <section className="grid gap-4">
          {rows.map((row) => (
            <article
              key={row.id}
              className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-[#111827]">
                      {row.title}
                    </h2>
                    <Badge tone="info">{row.category}</Badge>
                    {row.is_required ? (
                      <Badge tone="warning">required</Badge>
                    ) : null}
                    {row.is_acknowledged ? (
                      <Badge tone="success">acknowledged</Badge>
                    ) : null}
                  </div>

                  {row.description ? (
                    <p className="mt-2 text-sm leading-6 text-[#4B5563]">
                      {row.description}
                    </p>
                  ) : null}

                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                        File
                      </div>
                      <div className="mt-1 text-sm font-medium text-[#111827]">
                        {row.file_name}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                        Revision
                      </div>
                      <div className="mt-1 text-sm font-medium text-[#111827]">
                        {row.revision_label || "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                        Effective date
                      </div>
                      <div className="mt-1 text-sm font-medium text-[#111827]">
                        {formatDate(row.effective_date)}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                        Expiration date
                      </div>
                      <div className="mt-1 text-sm font-medium text-[#111827]">
                        {formatDate(row.expires_at)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openResource(row.id)}
                    disabled={openingId === row.id}
                    className="rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {openingId === row.id ? "Opening..." : "Open"}
                  </button>

                  {row.is_required && !row.is_acknowledged ? (
                    <button
                      type="button"
                      onClick={() => acknowledge(row.id)}
                      disabled={ackId === row.id}
                      className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {ackId === row.id ? "Saving..." : "Acknowledge"}
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}