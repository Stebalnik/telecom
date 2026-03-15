"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { getMyProfile } from "../../../../lib/profile";

type RequestDetails = {
  id: string;
  company_id: string;
  requested_by: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  admin_comment: string | null;
  comment: string | null;

  proposed_legal_name: string | null;
  proposed_dba_name: string | null;
  proposed_fein: string | null;
  proposed_phone: string | null;
  proposed_email: string | null;
  proposed_address_line1: string | null;
  proposed_address_line2: string | null;
  proposed_city: string | null;
  proposed_state: string | null;
  proposed_zip: string | null;
  proposed_country: string | null;
  proposed_bank_account_holder: string | null;
  proposed_bank_routing: string | null;
  proposed_bank_account: string | null;
};

type CompanyRow = {
  id: string;
  legal_name: string | null;
  dba_name: string | null;
  fein: string | null;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  bank_account_holder: string | null;
  bank_routing: string | null;
  bank_account: string | null;
};

type RequestFile = {
  id: string;
  file_name: string | null;
  file_path: string;
  created_at: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const styles =
    status === "approved"
      ? "border-green-200 bg-green-50 text-green-700"
      : status === "rejected"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${styles}`}
    >
      {status}
    </span>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-[#111827]">
        {value || "—"}
      </div>
    </div>
  );
}

export default function AdminCompanyChangeRequestDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [requestRow, setRequestRow] = useState<RequestDetails | null>(null);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [files, setFiles] = useState<RequestFile[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [adminComment, setAdminComment] = useState("");

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

      if (!profile || profile.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      const { data: reqData, error: reqErr } = await supabase
        .from("company_change_requests")
        .select("*")
        .eq("id", id)
        .single();

      if (reqErr) throw new Error(reqErr.message);

      setRequestRow(reqData as RequestDetails);
      setAdminComment(reqData.admin_comment || "");

      const { data: companyData, error: companyErr } = await supabase
        .from("contractor_companies")
        .select(`
          id,
          legal_name,
          dba_name,
          fein,
          phone,
          email,
          address_line1,
          address_line2,
          city,
          state,
          zip,
          country,
          bank_account_holder,
          bank_routing,
          bank_account
        `)
        .eq("id", reqData.company_id)
        .single();

      if (companyErr) throw new Error(companyErr.message);
      setCompany(companyData as CompanyRow);

      const { data: fileRows, error: filesErr } = await supabase
        .from("company_change_request_files")
        .select("id, file_name, file_path, created_at")
        .eq("request_id", id)
        .order("created_at", { ascending: true });

      if (filesErr) throw new Error(filesErr.message);

      const list = (fileRows || []) as RequestFile[];
      setFiles(list);

      const nextSignedUrls: Record<string, string> = {};
      for (const f of list) {
        const { data: signed, error: signedErr } = await supabase.storage
          .from("company-change-files")
          .createSignedUrl(f.file_path, 60 * 30);

        if (!signedErr && signed?.signedUrl) {
          nextSignedUrls[f.id] = signed.signedUrl;
        }
      }
      setSignedUrls(nextSignedUrls);
    } catch (e: any) {
      setErr(e.message ?? "Load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleApprove() {
    if (!requestRow || !company) return;

    setSaving(true);
    setErr(null);

    try {
      const payload = {
        legal_name: requestRow.proposed_legal_name || company.legal_name,
        dba_name: requestRow.proposed_dba_name,
        fein: requestRow.proposed_fein,
        phone: requestRow.proposed_phone,
        email: requestRow.proposed_email,
        address_line1: requestRow.proposed_address_line1,
        address_line2: requestRow.proposed_address_line2,
        city: requestRow.proposed_city,
        state: requestRow.proposed_state,
        zip: requestRow.proposed_zip,
        country: requestRow.proposed_country || "US",
        bank_account_holder: requestRow.proposed_bank_account_holder,
        bank_routing: requestRow.proposed_bank_routing,
        bank_account: requestRow.proposed_bank_account,
      };

      const { error: companyErr } = await supabase
        .from("contractor_companies")
        .update(payload)
        .eq("id", requestRow.company_id);

      if (companyErr) throw new Error(companyErr.message);

      const { error: requestErr } = await supabase
        .from("company_change_requests")
        .update({
          status: "approved",
          admin_comment: adminComment.trim() || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestRow.id);

      if (requestErr) throw new Error(requestErr.message);

      router.push("/admin/company-change-requests");
    } catch (e: any) {
      setErr(e.message ?? "Approve error");
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!requestRow) return;

    setSaving(true);
    setErr(null);

    try {
      const { error } = await supabase
        .from("company_change_requests")
        .update({
          status: "rejected",
          admin_comment: adminComment.trim() || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestRow.id);

      if (error) throw new Error(error.message);

      router.push("/admin/company-change-requests");
    } catch (e: any) {
      setErr(e.message ?? "Reject error");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <p className="text-sm text-[#4B5563]">Loading request...</p>
          </section>
        </div>
      </main>
    );
  }

  if (!requestRow || !company) {
    return (
      <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <p className="text-sm text-[#4B5563]">Request not found.</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#111827]">
                Company change request
              </h1>
              <p className="mt-2 text-sm text-[#4B5563]">
                Review proposed contractor company data changes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/company-change-requests"
                className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
              >
                Back to requests
              </Link>
            </div>
          </div>
        </section>

        {err ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {err}
          </section>
        ) : null}

        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                Company ID
              </div>
              <div className="mt-1 text-sm font-medium text-[#111827] break-all">
                {requestRow.company_id}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                Request ID
              </div>
              <div className="mt-1 text-sm font-medium text-[#111827] break-all">
                {requestRow.id}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                Status
              </div>
              <div className="mt-2">
                <StatusBadge status={requestRow.status} />
              </div>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                Created
              </div>
              <div className="mt-1 text-sm font-medium text-[#111827]">
                {formatDate(requestRow.created_at)}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                Reviewed
              </div>
              <div className="mt-1 text-sm font-medium text-[#111827]">
                {formatDate(requestRow.reviewed_at)}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">
            Contractor comment
          </h2>
          <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#111827]">
            {requestRow.comment || "—"}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#111827]">
              Current company data
            </h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Legal name" value={company.legal_name} />
              <Field label="DBA" value={company.dba_name} />
              <Field label="FEIN" value={company.fein} />
              <Field label="Phone" value={company.phone} />
              <Field label="Email" value={company.email} />
              <Field label="Country" value={company.country} />
              <div className="md:col-span-2">
                <Field
                  label="Address"
                  value={
                    [
                      company.address_line1,
                      company.address_line2,
                      [company.city, company.state, company.zip]
                        .filter(Boolean)
                        .join(", "),
                    ]
                      .filter(Boolean)
                      .join(" | ") || "—"
                  }
                />
              </div>
              <Field
                label="Bank account holder"
                value={company.bank_account_holder}
              />
              <Field label="Routing" value={company.bank_routing} />
              <Field label="Account" value={company.bank_account} />
            </div>
          </section>

          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#111827]">
              Proposed company data
            </h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Legal name" value={requestRow.proposed_legal_name} />
              <Field label="DBA" value={requestRow.proposed_dba_name} />
              <Field label="FEIN" value={requestRow.proposed_fein} />
              <Field label="Phone" value={requestRow.proposed_phone} />
              <Field label="Email" value={requestRow.proposed_email} />
              <Field label="Country" value={requestRow.proposed_country} />
              <div className="md:col-span-2">
                <Field
                  label="Address"
                  value={
                    [
                      requestRow.proposed_address_line1,
                      requestRow.proposed_address_line2,
                      [
                        requestRow.proposed_city,
                        requestRow.proposed_state,
                        requestRow.proposed_zip,
                      ]
                        .filter(Boolean)
                        .join(", "),
                    ]
                      .filter(Boolean)
                      .join(" | ") || "—"
                  }
                />
              </div>
              <Field
                label="Bank account holder"
                value={requestRow.proposed_bank_account_holder}
              />
              <Field label="Routing" value={requestRow.proposed_bank_routing} />
              <Field label="Account" value={requestRow.proposed_bank_account} />
            </div>
          </section>
        </section>

        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">
            Attached files
          </h2>

          <div className="mt-4 space-y-3">
            {files.length === 0 ? (
              <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                No files attached.
              </div>
            ) : (
              files.map((file) => (
                <div
                  key={file.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="text-sm font-medium text-[#111827]">
                      {file.file_name || file.file_path}
                    </div>
                    <div className="mt-1 text-xs text-[#6B7280]">
                      Uploaded: {formatDate(file.created_at)}
                    </div>
                  </div>

                  {signedUrls[file.id] ? (
                    <a
                      href={signedUrls[file.id]}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                    >
                      Open
                    </a>
                  ) : (
                    <span className="text-sm text-[#6B7280]">URL unavailable</span>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">
            Admin review
          </h2>

          <div className="mt-4">
            <label className="block text-sm font-medium text-[#111827]">
              Admin comment
            </label>
            <textarea
              className="mt-2 min-h-[120px] w-full rounded-2xl border border-[#D9E2EC] px-4 py-3 text-sm outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              placeholder="Comment for contractor"
            />
          </div>

          {requestRow.status === "pending" ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={handleApprove}
                disabled={saving}
                className="rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Processing..." : "Approve"}
              </button>

              <button
                onClick={handleReject}
                disabled={saving}
                className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reject
              </button>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
              This request has already been reviewed.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}