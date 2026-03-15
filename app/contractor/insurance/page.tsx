"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { getMyProfile } from "../../../lib/profile";
import { getMyCompany, type Company } from "../../../lib/contractor";
import { recalcCompanyStatus } from "../../../lib/eligibility";
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
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}>
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

export default function ContractorInsurancePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [company, setCompany] = useState<Company | null>(null);
  const [insuranceTypes, setInsuranceTypes] = useState<InsuranceType[]>([]);
  const [docs, setDocs] = useState<DocumentRow[]>([]);

  const [insuranceTypeId, setInsuranceTypeId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function loadPage() {
    setLoading(true);
    setErr(null);

    try {
      const { data } = await supabase.auth.getSession();

      if (!data.session?.user) {
        router.replace("/login");
        return;
      }

      const profile = await getMyProfile();

      if (!profile || profile.role !== "contractor") {
        router.replace("/dashboard");
        return;
      }

      const currentCompany = await getMyCompany();

      if (!currentCompany || currentCompany.onboarding_status === "draft") {
        router.replace("/contractor/onboarding/company");
        return;
      }

      setCompany(currentCompany);

      const [types, insuranceDocs] = await Promise.all([
        listInsuranceTypes(),
        listCompanyInsurance(currentCompany.id),
      ]);

      setInsuranceTypes(types);
      setDocs(insuranceDocs);
    } catch (e: any) {
      setErr(e?.message || "Failed to load insurance.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approvedCount = useMemo(
    () => docs.filter((d) => d.verification_status === "approved").length,
    [docs]
  );

  const pendingCount = useMemo(
    () => docs.filter((d) => d.verification_status === "pending").length,
    [docs]
  );

  const rejectedCount = useMemo(
    () => docs.filter((d) => d.verification_status === "rejected").length,
    [docs]
  );

  async function handleUpload() {
    setErr(null);

    try {
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

      setBusy(true);

      await createInsuranceDocument({
        companyId: company.id,
        insuranceTypeId,
        expiresAt,
        file,
      });

      setInsuranceTypeId("");
      setExpiresAt("");
      setFile(null);

      await loadPage();
    } catch (e: any) {
      setErr(e?.message || "Upload insurance error.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRecalc() {
    if (!company) return;

    try {
      setBusy(true);
      setErr(null);
      await recalcCompanyStatus(company.id);
      await loadPage();
    } catch (e: any) {
      setErr(e?.message || "Recalculate company eligibility error.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(doc: DocumentRow) {
    try {
      setBusy(true);
      setErr(null);

      await deleteDocument({
        id: doc.id,
        file_path: doc.file_path,
      });

      await loadPage();
    } catch (e: any) {
      setErr(e?.message || "Delete insurance error.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="LEOTEOR" width={24} height={24} className="h-6 w-6 rounded object-contain" />
            <div>
              <h1 className="text-2xl font-semibold text-[#0A2E5C]">Insurance</h1>
              <p className="mt-1 text-sm text-[#4B5563]">Loading insurance documents...</p>
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
              <Image src="/logo.png" alt="LEOTEOR" width={24} height={24} className="h-6 w-6 rounded object-contain" />
              <span className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
                Contractor workspace
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#0A2E5C]">
              Insurance
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
              Upload and manage insurance documents used for contractor eligibility,
              customer approvals, and compliance review.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRecalc}
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
          <h2 className="text-lg font-semibold text-[#0A2E5C]">Upload insurance</h2>

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
                onClick={handleUpload}
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
                        onClick={() => handleDelete(doc)}
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