"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { getMyProfile } from "../../../lib/profile";
import { getMyCompany, type Company } from "../../../lib/contractor";
import { recalcCompanyStatus } from "../../../lib/eligibility";
import { normalizeError } from "../../../lib/errors/normalizeError";
import { withErrorLogging } from "../../../lib/errors/withErrorLogging";
import {
  deleteDocument,
  listCompanyInsurance,
  listInsuranceTypes,
  createInsuranceDocument,
  type DocumentRow,
  type InsuranceType,
} from "../../../lib/documents";

function StatusBadge({ status }: { status?: string | null }) {
  const normalized = (status || "").toLowerCase();

  const cls =
    normalized === "approved" || normalized === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalized === "pending"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : normalized === "rejected" || normalized === "blocked"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}
    >
      {status || "Unknown"}
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
      <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-[#0A2E5C]">{value}</div>
      {hint ? <div className="mt-1 text-sm text-[#4B5563]">{hint}</div> : null}
    </div>
  );
}

function getSafeErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const normalized = normalizeError(error);
  const message = String(normalized.message || "").toLowerCase();
  const code = String(normalized.code || "").toLowerCase();

  if (
    code.includes("not_logged_in") ||
    code.includes("session") ||
    message.includes("not logged in") ||
    message.includes("session")
  ) {
    return "Your session has expired. Please log in again.";
  }

  return fallback;
}

export default function ContractorInsurancePage() {
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  const [company, setCompany] = useState<Company | null>(null);
  const [insuranceTypes, setInsuranceTypes] = useState<InsuranceType[]>([]);
  const [docs, setDocs] = useState<DocumentRow[]>([]);

  const [insuranceTypeId, setInsuranceTypeId] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  async function loadPage(): Promise<void> {
    setLoading(true);
    setErr(null);

    try {
      const { data } = await withErrorLogging<{
        data: {
          session: Awaited<
            ReturnType<typeof supabase.auth.getSession>
          >["data"]["session"];
        };
      }>(
        async () => {
          const result = await supabase.auth.getSession();

          if (result.error) {
            throw result.error;
          }

          return result;
        },
        {
          message: "contractor_insurance_session_failed",
          code: "contractor_insurance_session_failed",
          source: "frontend",
          area: "contractor",
          path: "/contractor/insurance",
        },
      );

      if (!data.session?.user) {
        router.replace("/login");
        return;
      }

      const profile = await withErrorLogging<Awaited<ReturnType<typeof getMyProfile>>>(
        () => getMyProfile(),
        {
          message: "contractor_insurance_profile_failed",
          code: "contractor_insurance_profile_failed",
          source: "frontend",
          area: "contractor",
          path: "/contractor/insurance",
        },
      );

      if (!profile || profile.role !== "contractor") {
        router.replace("/dashboard");
        return;
      }

      const currentCompany = await withErrorLogging<
        Awaited<ReturnType<typeof getMyCompany>>
      >(
        () => getMyCompany(),
        {
          message: "contractor_insurance_company_failed",
          code: "contractor_insurance_company_failed",
          source: "frontend",
          area: "contractor",
          path: "/contractor/insurance",
        },
      );

      if (!currentCompany || currentCompany.onboarding_status === "draft") {
        router.replace("/contractor/onboarding/company");
        return;
      }

      setCompany(currentCompany);

      const [types, insuranceDocs] = await Promise.all([
        withErrorLogging<InsuranceType[]>(
          () => listInsuranceTypes(),
          {
            message: "contractor_insurance_types_failed",
            code: "contractor_insurance_types_failed",
            source: "frontend",
            area: "documents",
            path: "/contractor/insurance",
          },
        ),
        withErrorLogging<DocumentRow[]>(
          () => listCompanyInsurance(currentCompany.id),
          {
            message: "contractor_company_insurance_list_failed",
            code: "contractor_company_insurance_list_failed",
            source: "frontend",
            area: "documents",
            path: "/contractor/insurance",
            details: {
              companyId: currentCompany.id,
            },
          },
        ),
      ]);

      setInsuranceTypes(types);
      setDocs(insuranceDocs);
    } catch (error: unknown) {
      setErr(getSafeErrorMessage(error, "Failed to load insurance."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approvedCount = useMemo<number>(
    () => docs.filter((d) => d.verification_status === "approved").length,
    [docs],
  );

  const pendingCount = useMemo<number>(
    () => docs.filter((d) => d.verification_status === "pending").length,
    [docs],
  );

  const rejectedCount = useMemo<number>(
    () => docs.filter((d) => d.verification_status === "rejected").length,
    [docs],
  );

  async function handleUpload(): Promise<void> {
    setErr(null);

    if (!company) {
      setErr("Company is required.");
      return;
    }

    if (!insuranceTypeId) {
      setErr("Select insurance type.");
      return;
    }

    if (!expiresAt) {
      setErr("Set expiration date.");
      return;
    }

    if (!file) {
      setErr("Choose a file.");
      return;
    }

    try {
      setBusy(true);

      await withErrorLogging<void>(
        () =>
          createInsuranceDocument({
            companyId: company.id,
            insuranceTypeId,
            expiresAt,
            file,
          }),
        {
          message: "contractor_insurance_upload_failed",
          code: "contractor_insurance_upload_failed",
          source: "frontend",
          area: "documents",
          path: "/contractor/insurance",
          details: {
            companyId: company.id,
            insuranceTypeId,
            expiresAt,
            fileName: file.name,
          },
        },
      );

      setInsuranceTypeId("");
      setExpiresAt("");
      setFile(null);

      await loadPage();
    } catch (error: unknown) {
      setErr(getSafeErrorMessage(error, "Unable to upload insurance."));
    } finally {
      setBusy(false);
    }
  }

  async function handleRecalc(): Promise<void> {
    if (!company) return;

    try {
      setBusy(true);
      setErr(null);

      await withErrorLogging<void>(
        () => recalcCompanyStatus(company.id),
        {
          message: "contractor_recalc_eligibility_failed",
          code: "contractor_recalc_eligibility_failed",
          source: "frontend",
          area: "contractor",
          path: "/contractor/insurance",
          details: {
            companyId: company.id,
          },
        },
      );

      await loadPage();
    } catch (error: unknown) {
      setErr(getSafeErrorMessage(error, "Unable to recalculate company eligibility."));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(doc: DocumentRow): Promise<void> {
    try {
      setBusy(true);
      setErr(null);

      await withErrorLogging<void>(
        () =>
          deleteDocument({
            id: doc.id,
            file_path: doc.file_path,
          }),
        {
          message: "contractor_insurance_delete_failed",
          code: "contractor_insurance_delete_failed",
          source: "frontend",
          area: "documents",
          path: "/contractor/insurance",
          details: {
            documentId: doc.id,
            filePath: doc.file_path,
            verificationStatus: doc.verification_status ?? null,
          },
        },
      );

      await loadPage();
    } catch (error: unknown) {
      setErr(getSafeErrorMessage(error, "Unable to delete insurance document."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="LEOTEOR"
              width={24}
              height={24}
              className="h-6 w-6 rounded object-contain"
            />
            <div>
              <h1 className="text-2xl font-semibold text-[#0A2E5C]">
                Insurance
              </h1>
              <p className="mt-1 text-sm text-[#4B5563]">
                Loading insurance documents...
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
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
              Insurance
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
              Upload and manage insurance documents used for contractor
              eligibility, customer approvals, and compliance review.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void handleRecalc()}
              disabled={busy || !company}
              className="inline-flex items-center justify-center rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-semibold text-[#0A2E5C] transition hover:bg-[#F4F8FC] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Recalculate eligibility
            </button>

            <Link
              href="/contractor"
              className="inline-flex items-center justify-center rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-semibold text-[#0A2E5C] transition hover:bg-[#F4F8FC]"
            >
              Back to overview
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
        <StatCard label="Total documents" value={docs.length} />
        <StatCard label="Approved" value={approvedCount} />
        <StatCard label="Pending" value={pendingCount} />
        <StatCard label="Rejected" value={rejectedCount} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0A2E5C]">
            Upload insurance
          </h2>

          <div className="mt-4 grid gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0A2E5C]">
                Insurance type
              </label>
              <select
                className="mt-1 w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#2EA3FF] focus:ring-2 focus:ring-[#8FC8FF]"
                value={insuranceTypeId}
                onChange={(e) => setInsuranceTypeId(e.target.value)}
              >
                <option value="">Select insurance type</option>
                {insuranceTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0A2E5C]">
                Expiration date
              </label>
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#2EA3FF] focus:ring-2 focus:ring-[#8FC8FF]"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0A2E5C]">
                File
              </label>
              <input
                type="file"
                className="mt-1 block w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-[#EAF3FF] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#1F6FB5]"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                onClick={() => void handleUpload()}
                disabled={busy}
                className="inline-flex items-center justify-center rounded-xl bg-[#2EA3FF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Upload insurance
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0A2E5C]">Documents</h2>

          <div className="mt-4 space-y-3">
            {docs.length === 0 ? (
              <div className="rounded-xl border border-[#D9E2EC] bg-[#F9FBFD] px-4 py-6 text-sm text-[#4B5563]">
                No insurance documents yet.
              </div>
            ) : (
              docs.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-xl border border-[#D9E2EC] bg-[#F9FBFD] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#111827]">
                        {doc.insurance_type?.name ?? "Insurance"}
                      </div>
                      <div className="mt-1 text-sm text-[#4B5563]">
                        Expires: {doc.expires_at || "—"}
                      </div>
                      {doc.verification_note ? (
                        <div className="mt-2 text-sm text-red-700">
                          {doc.verification_note}
                        </div>
                      ) : null}
                    </div>

                    <StatusBadge status={doc.verification_status} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <a
                      href={doc.file_public_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#1F6FB5] transition hover:bg-[#F4F8FC]"
                    >
                      Open file
                    </a>

                    {(doc.verification_status === "rejected" ||
                      doc.verification_status === "pending") && (
                      <button
                        onClick={() => void handleDelete(doc)}
                        disabled={busy}
                        className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}