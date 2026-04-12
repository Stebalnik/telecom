"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeError } from "../../../lib/errors/normalizeError";
import { withErrorLogging } from "../../../lib/errors/withErrorLogging";
import { supabase } from "../../../lib/supabaseClient";

type AppLikeError = Error & {
  code?: string;
  details?: Record<string, unknown>;
};

type CertificationRow = {
  id: string;
  cert_type: string | null;
  issuing_body: string | null;
  certificate_number: string | null;
  issued_at: string | null;
  expires_at: string | null;
  verification_status: string | null;
};

type CertificationForm = {
  cert_type: string;
  issuing_body: string;
  certificate_number: string;
  issued_at: string;
  expires_at: string;
};

const CERTIFICATION_OPTIONS = [
  "Tower Climber Certification",
  "Rigging Certification",
  "CPR / First Aid",
  "OSHA 10",
  "OSHA 30",
  "RF Awareness",
  "Fall Protection",
  "Rescue Certification",
  "Fiber Certification",
  "Electrical Safety",
  "Aerial Lift Certification",
  "Driver Qualification",
  "Other",
] as const;

const EMPTY_FORM: CertificationForm = {
  cert_type: "",
  issuing_body: "",
  certificate_number: "",
  issued_at: "",
  expires_at: "",
};

function getSafeCertificationErrorMessage(error: unknown, fallback: string) {
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

export default function WorkerCertificationsPage() {
  const [items, setItems] = useState<CertificationRow[]>([]);
  const [form, setForm] = useState<CertificationForm>(EMPTY_FORM);
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

    async function loadCertifications() {
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
            message: "specialist_certifications_session_load_failed",
            code: "specialist_certifications_session_load_failed",
            source: "frontend",
            area: "worker_certifications",
            role: "specialist",
            path: "/worker/certifications",
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
              .from("worker_certifications")
              .select(
                `
                  id,
                  cert_type,
                  issuing_body,
                  certificate_number,
                  issued_at,
                  expires_at,
                  verification_status
                `
              )
              .eq("worker_id", userId)
              .order("created_at", { ascending: false });

            if (result.error) {
              throw result.error;
            }

            return (result.data ?? []) as CertificationRow[];
          },
          {
            message: "specialist_certifications_load_failed",
            code: "specialist_certifications_load_failed",
            source: "frontend",
            area: "worker_certifications",
            role: "specialist",
            path: "/worker/certifications",
          }
        );

        if (!mounted) return;

        setItems(rows);
      } catch (error) {
        if (!mounted) return;
        setErr(
          getSafeCertificationErrorMessage(
            error,
            "Unable to load certifications. Please refresh and try again."
          )
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadCertifications();

    return () => {
      mounted = false;
    };
  }, []);

  function updateField<K extends keyof CertificationForm>(
    key: K,
    value: CertificationForm[K]
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
          message: "specialist_certification_session_save_failed",
          code: "specialist_certification_session_save_failed",
          source: "frontend",
          area: "worker_certifications",
          role: "specialist",
          path: "/worker/certifications",
        }
      );

      const userId = sessionResult.data.session?.user?.id;

      if (!userId) {
        throw new Error("Not logged in");
      }

      const inserted = await withErrorLogging(
        async () => {
          const result = await supabase
            .from("worker_certifications")
            .insert({
              worker_id: userId,
              cert_type: form.cert_type || null,
              issuing_body: form.issuing_body.trim() || null,
              certificate_number: form.certificate_number.trim() || null,
              issued_at: form.issued_at || null,
              expires_at: form.expires_at || null,
            })
            .select(
              `
                id,
                cert_type,
                issuing_body,
                certificate_number,
                issued_at,
                expires_at,
                verification_status
              `
            )
            .single();

          if (result.error) {
            throw result.error;
          }

          return result.data as CertificationRow;
        },
        {
          message: "specialist_certification_save_failed",
          code: "specialist_certification_save_failed",
          source: "frontend",
          area: "worker_certifications",
          role: "specialist",
          path: "/worker/certifications",
          details: {
            certType: form.cert_type || null,
          },
        }
      );

      setItems((prev) => [inserted, ...prev]);
      setForm(EMPTY_FORM);
      setMessage("Certification added.");
    } catch (error) {
      setErr(
        getSafeCertificationErrorMessage(
          error,
          "Unable to save certification. Please try again."
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
            .from("worker_certifications")
            .delete()
            .eq("id", id);

          if (result.error) {
            throw result.error;
          }

          return result;
        },
        {
          message: "specialist_certification_delete_failed",
          code: "specialist_certification_delete_failed",
          source: "frontend",
          area: "worker_certifications",
          role: "specialist",
          path: "/worker/certifications",
          details: {
            certificationId: id,
          },
        }
      );

      setItems((prev) => prev.filter((item) => item.id !== id));
      setMessage("Certification removed.");
    } catch (error) {
      setErr(
        getSafeCertificationErrorMessage(
          error,
          "Unable to remove certification. Please try again."
        )
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#0A2E5C]">
          Certifications
        </h1>
        <p className="mt-2 text-sm text-[#4B5563]">
          Add and maintain your telecom-related certifications so contractors
          can evaluate your qualifications.
        </p>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading certifications...</p>
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
              Add certification
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="cert_type"
                  className="mb-2 block text-sm font-medium text-[#111827]"
                >
                  Certification type
                </label>
                <select
                  id="cert_type"
                  value={form.cert_type}
                  onChange={(e) => updateField("cert_type", e.target.value)}
                  className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                >
                  <option value="">Select certification</option>
                  {CERTIFICATION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="issuing_body"
                  className="mb-2 block text-sm font-medium text-[#111827]"
                >
                  Issuing body
                </label>
                <input
                  id="issuing_body"
                  type="text"
                  value={form.issuing_body}
                  onChange={(e) => updateField("issuing_body", e.target.value)}
                  placeholder="Who issued this certification"
                  className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="certificate_number"
                  className="mb-2 block text-sm font-medium text-[#111827]"
                >
                  Certificate number
                </label>
                <input
                  id="certificate_number"
                  type="text"
                  value={form.certificate_number}
                  onChange={(e) =>
                    updateField("certificate_number", e.target.value)
                  }
                  placeholder="Certificate number"
                  className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="issued_at"
                  className="mb-2 block text-sm font-medium text-[#111827]"
                >
                  Issued date
                </label>
                <input
                  id="issued_at"
                  type="date"
                  value={form.issued_at}
                  onChange={(e) => updateField("issued_at", e.target.value)}
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
                disabled={saving || !form.cert_type}
                className={`rounded-xl px-5 py-3 text-sm font-medium text-white transition ${
                  saving || !form.cert_type
                    ? "cursor-not-allowed bg-[#9CA3AF]"
                    : "bg-[#1F6FB5] hover:bg-[#0A2E5C]"
                }`}
              >
                {saving ? "Saving..." : "Add certification"}
              </button>

              <a
                href="/worker/insurance"
                className="rounded-xl border border-[#D9E2EC] bg-white px-5 py-3 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
              >
                Go to insurance
              </a>
            </div>
          </form>

          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-[#111827]">
                Your certifications
              </h2>
              <div className="text-sm text-[#4B5563]">
                {sortedItems.length} total
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {sortedItems.length === 0 ? (
                <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                  No certifications added yet.
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
                            {item.cert_type || "Certification"}
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
                              Issuer:
                            </span>{" "}
                            {item.issuing_body || "—"}
                          </div>
                          <div>
                            <span className="font-medium text-[#111827]">
                              Certificate #:
                            </span>{" "}
                            {item.certificate_number || "—"}
                          </div>
                          <div>
                            <span className="font-medium text-[#111827]">
                              Issued:
                            </span>{" "}
                            {formatDate(item.issued_at)}
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