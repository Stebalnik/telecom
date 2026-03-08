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

export default function AdminCompanyChangeRequestDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [requestRow, setRequestRow] = useState<RequestDetails | null>(null);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [files, setFiles] = useState<RequestFile[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [adminComment, setAdminComment] = useState("");

  async function loadPage() {
    setLoading(true);
    setErr(null);

    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
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
    setOk(null);

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

      setOk("Request approved.");
      await loadPage();
    } catch (e: any) {
      setErr(e.message ?? "Approve error");
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!requestRow) return;

    setSaving(true);
    setErr(null);
    setOk(null);

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

      setOk("Request rejected.");
      await loadPage();
    } catch (e: any) {
      setErr(e.message ?? "Reject error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="p-6">Loading...</main>;
  if (!requestRow || !company) return <main className="p-6">Request not found.</main>;

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Change request</h1>
          <p className="text-sm text-gray-600">
            Status: <b>{requestRow.status}</b>
          </p>
        </div>

        <Link href="/admin/company-change-requests" className="underline">
          Back
        </Link>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
      {ok && <p className="text-sm text-green-600">{ok}</p>}

      <section className="rounded border p-4">
        <h2 className="text-lg font-semibold">Contractor comment</h2>
        <p className="mt-2 text-sm text-gray-700">{requestRow.comment || "—"}</p>
      </section>

      <section className="rounded border p-4">
        <h2 className="text-lg font-semibold">Current company data</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm">
          <div><b>Legal name:</b> {company.legal_name || "—"}</div>
          <div><b>DBA:</b> {company.dba_name || "—"}</div>
          <div><b>FEIN:</b> {company.fein || "—"}</div>
          <div><b>Phone:</b> {company.phone || "—"}</div>
          <div><b>Email:</b> {company.email || "—"}</div>
          <div><b>Country:</b> {company.country || "—"}</div>
          <div className="md:col-span-2">
            <b>Address:</b>{" "}
            {[company.address_line1, company.address_line2, [company.city, company.state, company.zip].filter(Boolean).join(", ")]
              .filter(Boolean)
              .join(" | ") || "—"}
          </div>
        </div>
      </section>

      <section className="rounded border p-4">
        <h2 className="text-lg font-semibold">Proposed company data</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm">
          <div><b>Legal name:</b> {requestRow.proposed_legal_name || "—"}</div>
          <div><b>DBA:</b> {requestRow.proposed_dba_name || "—"}</div>
          <div><b>FEIN:</b> {requestRow.proposed_fein || "—"}</div>
          <div><b>Phone:</b> {requestRow.proposed_phone || "—"}</div>
          <div><b>Email:</b> {requestRow.proposed_email || "—"}</div>
          <div><b>Country:</b> {requestRow.proposed_country || "—"}</div>
          <div className="md:col-span-2">
            <b>Address:</b>{" "}
            {[requestRow.proposed_address_line1, requestRow.proposed_address_line2, [requestRow.proposed_city, requestRow.proposed_state, requestRow.proposed_zip].filter(Boolean).join(", ")]
              .filter(Boolean)
              .join(" | ") || "—"}
          </div>
        </div>
      </section>

      <section className="rounded border p-4">
        <h2 className="text-lg font-semibold">Attached files</h2>

        <div className="mt-4 space-y-2">
          {files.length === 0 ? (
            <p className="text-sm text-gray-600">No files attached.</p>
          ) : (
            files.map((file) => (
              <div key={file.id} className="flex items-center justify-between rounded border p-3">
                <div className="text-sm">{file.file_name || file.file_path}</div>
                {signedUrls[file.id] ? (
                  <a
                    href={signedUrls[file.id]}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-sm"
                  >
                    Open
                  </a>
                ) : (
                  <span className="text-sm text-gray-500">URL unavailable</span>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded border p-4">
        <h2 className="text-lg font-semibold">Admin review</h2>

        <textarea
          className="mt-4 w-full rounded border p-2"
          rows={4}
          value={adminComment}
          onChange={(e) => setAdminComment(e.target.value)}
          placeholder="Comment for contractor"
        />

        {requestRow.status === "pending" && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleApprove}
              disabled={saving}
              className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              Approve
            </button>

            <button
              onClick={handleReject}
              disabled={saving}
              className="rounded border px-4 py-2 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        )}
      </section>
    </main>
  );
}