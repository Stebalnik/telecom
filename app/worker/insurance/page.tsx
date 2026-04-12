"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeError } from "../../../lib/errors/normalizeError";
import { withErrorLogging } from "../../../lib/errors/withErrorLogging";
import { supabase } from "../../../lib/supabaseClient";

type AppLikeError = Error & {
  code?: string;
  details?: Record<string, unknown>;
};

type InsuranceRow = {
  id: string;
  insurance_type: string | null;
  provider_name: string | null;
  policy_number: string | null;
  expires_at: string | null;
  verification_status: string | null;
};

type InsuranceForm = {
  insurance_type: string;
  provider_name: string;
  policy_number: string;
  expires_at: string;
};

const INSURANCE_TYPE_OPTIONS = [
  "General Liability",
  "Professional Liability",
  "Workers' Compensation",
  "Commercial Auto",
  "Umbrella / Excess Liability",
  "Inland Marine",
  "Other",
] as const;

const EMPTY_FORM: InsuranceForm = {
  insurance_type: "",
  provider_name: "",
  policy_number: "",
  expires_at: "",
};

function getSafeInsuranceErrorMessage(error: unknown, fallback: string) {
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

function formatVerificationStatus(status: string | null) {
  const value = String(status || "").toLowerCase();

  if (value === "approved") return "Approved";
  if (value === "rejected") return "Rejected";
  if (value === "pending") return "Pending";
  return "Draft";
}

function getStatusBadgeClass(status: string | null) {
  const value = String(status || "").toLowerCase();

  if (value === "approved") {
    return "border border-green-200 bg-green-50 text-green-700";
  }

  if (value === "rejected") {
    return "border border-red-200 bg-red-50 text-red-700";
  }

  if (value === "pending") {
    return "border border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border border-[#D9E2EC] bg-[#F8FBFF] text-[#4B5563]";
}

export default function WorkerInsurancePage() {
  const [items, setItems] = useState<InsuranceRow[]>([]);
  const [form, setForm] = useState<InsuranceForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aDate = a.expires_at ? new Date(a.expires_at).getTime() : 0;
      const bDate = b.expires_at ? new Date(b.expires_at).getTime() : 0;

      return bDate - aDate;
    });
  }, [items]);

  useEffect(() => {
    let mounted = true;

    async function loadInsurance() {
      setLoading(true);
      setErr(null);
      setMessage(null);

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
            message: "specialist_insurance_session_load_failed",
            code: "specialist_insurance_session_load_failed",
            source: "frontend",
            area: "worker_insurance",
            role: "specialist",
            path: "/worker/insurance",
          }
        );

        if (!mounted) return;

        const userId = sessionResult.data.session?.user?.id;

        if (!userId) {
          setErr("Your session has expired. Please log in again.");
          return;
        }

        const rows = await withErrorLogging(
          async () => {
            const result = await supabase
              .from("worker_insurance")
              .select(
                `
                  id,
                  insurance_type,
                  provider_name,
                  policy_number,
                  expires_at,
                  verification_status
                `
              )
              .eq("worker_id", userId)
              .order("created_at", { ascending: false });

            if (result.error) {
              throw result.error;
            }

            return (result.data ?? []) as InsuranceRow[];
          },
          {
            message: "specialist_insurance_load_failed",
            code: "specialist_insurance_load_failed",
            source: "frontend",
            area: "worker_insurance",
            role: "specialist",
            path: "/worker/insurance",
          }
        );

        if (!mounted) return;

        setItems(rows);
      } catch (error) {
        if (!mounted) return;
        setErr(
          getSafeInsuranceErrorMessage(
            error,
            "Unable to load insurance records. Please refresh and try again."
          )
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadInsurance();

    return () => {
      mounted = false;
    };
  }, []);

  function updateField<K extends keyof InsuranceForm>(
    key: K,
    value: InsuranceForm[K]
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
      const sessionResult = await withErrorLogging(
        async () => {
          const result = await supabase.auth.getSession();

          if (result.error) {
            throw result.error;
          }

          return result;
        },
        {
          message: "specialist_insurance_session_save_failed",
          code: "specialist_insurance_session_save_failed",
          source: "frontend",
          area: "worker_insurance",
          role: "specialist",
          path: "/worker/insurance",
        }
      );

      const userId = sessionResult.data.session?.user?.id;

      if (!userId) {
        throw new Error("Not logged in");
      }

      const inserted = await withErrorLogging(
        async () => {
          const result = await supabase
            .from("worker_insurance")
            .insert({
              worker_id: userId,
              insurance_type: form.insurance_type || null,
              provider_name: form.provider_name.trim() || null,
              policy_number: form.policy_number.trim() || null,
              expires_at: form.expires_at || null,
            })
            .select(
              `
                id,
                insurance_type,
                provider_name,
                policy_number,
                expires_at,
                verification_status
              `
            )
            .single();

          if (result.error) {
            throw result.error;
          }

          return result.data as InsuranceRow;
        },
        {
          message: "specialist_insurance_save_failed",
          code: "specialist_insurance_save_failed",
          source: "frontend",
          area: "worker_insurance",
          role: "specialist",
          path: "/worker/insurance",
          details: {
            insuranceType: form.insurance_type || null,
          },
        }
      );

      setItems((prev) => [inserted, ...prev]);
      setForm(EMPTY_FORM);
      setMessage("Insurance record added.");
    } catch (error) {
      setErr(
        getSafeInsuranceErrorMessage(
          error,
          "Unable to save insurance record. Please try again."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setErr(null);
    setMessage(null);

    try {
      await withErrorLogging(
        async () => {
          const result = await supabase
            .from("worker_insurance")
            .delete()
            .eq("id", id);

          if (result.error) {
            throw result.error;
          }

          return result;
        },
        {
          message: "specialist_insurance_delete_failed",
          code: "specialist_insurance_delete_failed",
          source: "frontend",
          area: "worker_insurance",
          role: "specialist",
          path: "/worker/insurance",
          details: {
            insuranceId: id,
          },
        }
      );

      setItems((prev) => prev.filter((item) => item.id !== id));
      setMessage("Insurance record removed.");
    } catch (error) {
      setErr(
        getSafeInsuranceErrorMessage(
          error,
          "Unable to remove insurance record. Please try again."
        )
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#0A2E5C]">Insurance</h1>
        <p className="mt-2 text-sm text-[#4B5563]">
          Add your insurance records if they apply to your specialist profile or
          are required for certain opportunities.
        </p>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading insurance records...</p>
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
        <>
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-[#111827]">
              Add insurance
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="insurance_type"
                  className="mb-2 block text-sm font-medium text-[#111827]"
                >
                  Insurance type
                </label>
                <select
                  id="insurance_type"
                  value={form.insurance_type}
                  onChange={(e) =>
                    updateField("insurance_type", e.target.value)
                  }
                  className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                >
                  <option value="">Select insurance type</option>
                  {INSURANCE_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="provider_name"
                  className="mb-2 block text-sm font-medium text-[#111827]"
                >
                  Provider name
                </label>
                <input
                  id="provider_name"
                  type="text"
                  value={form.provider_name}
                  onChange={(e) => updateField("provider_name", e.target.value)}
                  placeholder="Insurance provider"
                  className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="policy_number"
                  className="mb-2 block text-sm font-medium text-[#111827]"
                >
                  Policy number
                </label>
                <input
                  id="policy_number"
                  type="text"
                  value={form.policy_number}
                  onChange={(e) => updateField("policy_number", e.target.value)}
                  placeholder="Policy number"
                  className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="expires_at"
                  className="mb-2 block text-sm font-medium text-[#111827]"
                >
                  Expiration date
                </label>
                <input
                  id="expires_at"
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => updateField("expires_at", e.target.value)}
                  className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving || !form.insurance_type}
                className={`rounded-xl px-5 py-3 text-sm font-medium text-white transition ${
                  saving || !form.insurance_type
                    ? "cursor-not-allowed bg-[#9CA3AF]"
                    : "bg-[#1F6FB5] hover:bg-[#0A2E5C]"
                }`}
              >
                {saving ? "Saving..." : "Add insurance"}
              </button>

              <a
                href="/worker/vacancies"
                className="rounded-xl border border-[#D9E2EC] bg-white px-5 py-3 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
              >
                Go to vacancies
              </a>
            </div>
          </form>

          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-[#111827]">
                Your insurance records
              </h2>
              <div className="text-sm text-[#4B5563]">
                {sortedItems.length} total
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {sortedItems.length === 0 ? (
                <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                  No insurance records added yet.
                </div>
              ) : (
                sortedItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-[#111827]">
                            {item.insurance_type || "Insurance"}
                          </h3>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(
                              item.verification_status
                            )}`}
                          >
                            {formatVerificationStatus(item.verification_status)}
                          </span>
                        </div>

                        <div className="mt-2 grid gap-2 text-sm text-[#4B5563] sm:grid-cols-2">
                          <div>
                            <span className="font-medium text-[#111827]">
                              Provider:
                            </span>{" "}
                            {item.provider_name || "—"}
                          </div>
                          <div>
                            <span className="font-medium text-[#111827]">
                              Policy #:
                            </span>{" "}
                            {item.policy_number || "—"}
                          </div>
                          <div>
                            <span className="font-medium text-[#111827]">
                              Expires:
                            </span>{" "}
                            {formatDate(item.expires_at)}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                          deletingId === item.id
                            ? "cursor-not-allowed border border-[#D9E2EC] bg-white text-[#9CA3AF]"
                            : "border border-red-200 bg-white text-red-700 hover:bg-red-50"
                        }`}
                      >
                        {deletingId === item.id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}