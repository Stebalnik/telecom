"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { getMyProfile } from "../../../../lib/profile";
import { getMyCompany } from "../../../../lib/contractor";

type Company = {
  id: string;
  legal_name: string;
  dba_name: string | null;
  fein?: string | null;
  phone?: string | null;
  email?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  bank_account_holder?: string | null;
  bank_routing?: string | null;
  bank_account?: string | null;
};

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

export default function ContractorCompanyChangeRequestPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [company, setCompany] = useState<Company | null>(null);

  const [legalName, setLegalName] = useState("");
  const [dbaName, setDbaName] = useState("");
  const [fein, setFein] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("US");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [bankRouting, setBankRouting] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);

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

      const c = await getMyCompany();
      if (!c) {
        router.replace("/contractor/onboarding/company");
        return;
      }

      setCompany(c);
      setLegalName(c.legal_name || "");
      setDbaName(c.dba_name || "");
      setFein((c as any).fein || "");
      setPhone((c as any).phone || "");
      setEmail((c as any).email || "");
      setAddressLine1((c as any).address_line1 || "");
      setAddressLine2((c as any).address_line2 || "");
      setCity((c as any).city || "");
      setStateValue((c as any).state || "");
      setZip((c as any).zip || "");
      setCountry((c as any).country || "US");
      setBankAccountHolder((c as any).bank_account_holder || "");
      setBankRouting((c as any).bank_routing || "");
      setBankAccount((c as any).bank_account || "");
    } catch (e: any) {
      setErr(e.message ?? "Load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    try {
      if (!company) {
        setErr("Company not found.");
        return;
      }

      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session?.user) {
        router.replace("/login");
        return;
      }

      setSaving(true);

      const { data: requestRow, error: requestErr } = await supabase
        .from("company_change_requests")
        .insert({
          company_id: company.id,
          requested_by: authData.session.user.id,
          proposed_legal_name: legalName.trim() || null,
          proposed_dba_name: dbaName.trim() || null,
          proposed_fein: fein.trim() || null,
          proposed_phone: phone.trim() || null,
          proposed_email: email.trim() || null,
          proposed_address_line1: addressLine1.trim() || null,
          proposed_address_line2: addressLine2.trim() || null,
          proposed_city: city.trim() || null,
          proposed_state: stateValue.trim() || null,
          proposed_zip: zip.trim() || null,
          proposed_country: country.trim() || "US",
          proposed_bank_account_holder: bankAccountHolder.trim() || null,
          proposed_bank_routing: bankRouting.trim() || null,
          proposed_bank_account: bankAccount.trim() || null,
          comment: comment.trim() || null,
          status: "pending",
        })
        .select("id")
        .single();

      if (requestErr) throw new Error(requestErr.message);

      if (files && files.length > 0) {
        for (const file of Array.from(files)) {
          const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
          const path = `${company.id}/${requestRow.id}/${crypto.randomUUID()}.${ext}`;

          const { error: uploadErr } = await supabase.storage
            .from("company-change-files")
            .upload(path, file, { upsert: false });

          if (uploadErr) throw new Error(uploadErr.message);

          const { data: publicUrlData } = supabase.storage
            .from("company-change-files")
            .getPublicUrl(path);

          const { error: fileRowErr } = await supabase
            .from("company_change_request_files")
            .insert({
              request_id: requestRow.id,
              uploaded_by: authData.session.user.id,
              file_name: file.name,
              file_path: path,
              file_public_url: publicUrlData.publicUrl,
            });

          if (fileRowErr) throw new Error(fileRowErr.message);
        }
      }

      setOk("Your request has been submitted to admin.");
      setComment("");
      setFiles(null);
    } catch (e: any) {
      setErr(e.message ?? "Submit error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827]">
              Company Change Request
            </h1>
            <p className="mt-2 text-sm text-[#4B5563]">
              Company data is locked. Submit a request to admin to update company information.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/contractor/company"
              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              Back to company
            </Link>

            <Link
              href="/contractor/requests"
              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              View all requests
            </Link>
          </div>
        </div>
      </section>

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      {ok ? (
        <section className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 shadow-sm">
          {ok}
        </section>
      ) : null}

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#111827]">
          Current company data
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Legal name" value={company?.legal_name} />
          <Field label="DBA" value={company?.dba_name} />
          <Field label="FEIN" value={(company as any)?.fein} />
          <Field label="Phone" value={(company as any)?.phone} />
          <Field label="Email" value={(company as any)?.email} />
          <Field label="Country" value={(company as any)?.country} />
          <div className="md:col-span-2">
            <Field
              label="Address"
              value={
                [
                  (company as any)?.address_line1,
                  (company as any)?.address_line2,
                  [(company as any)?.city, (company as any)?.state, (company as any)?.zip]
                    .filter(Boolean)
                    .join(", "),
                ]
                  .filter(Boolean)
                  .join(" | ") || "—"
              }
            />
          </div>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm space-y-4"
      >
        <h2 className="text-lg font-semibold text-[#111827]">
          Request company data change
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <input className="rounded-xl border border-[#D9E2EC] p-3 text-sm" value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Legal name" />
          <input className="rounded-xl border border-[#D9E2EC] p-3 text-sm" value={dbaName} onChange={(e) => setDbaName(e.target.value)} placeholder="DBA" />
          <input className="rounded-xl border border-[#D9E2EC] p-3 text-sm" value={fein} onChange={(e) => setFein(e.target.value)} placeholder="FEIN / Tax ID" />
          <input className="rounded-xl border border-[#D9E2EC] p-3 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
          <input className="rounded-xl border border-[#D9E2EC] p-3 text-sm md:col-span-2" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input className="rounded-xl border border-[#D9E2EC] p-3 text-sm md:col-span-2" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="Address line 1" />
          <input className="rounded-xl border border-[#D9E2EC] p-3 text-sm md:col-span-2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="Address line 2" />
          <input className="rounded-xl border border-[#D9E2EC] p-3 text-sm" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
          <input className="rounded-xl border border-[#D9E2EC] p-3 text-sm" value={stateValue} onChange={(e) => setStateValue(e.target.value)} placeholder="State" />
          <input className="rounded-xl border border-[#D9E2EC] p-3 text-sm" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP" />
          <input className="rounded-xl border border-[#D9E2EC] p-3 text-sm" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" />
          <input className="rounded-xl border border-[#D9E2EC] p-3 text-sm md:col-span-2" value={bankAccountHolder} onChange={(e) => setBankAccountHolder(e.target.value)} placeholder="Account holder" />
          <input className="rounded-xl border border-[#D9E2EC] p-3 text-sm" value={bankRouting} onChange={(e) => setBankRouting(e.target.value)} placeholder="Routing number" />
          <input className="rounded-xl border border-[#D9E2EC] p-3 text-sm" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="Account number" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[#111827]">
            Comment / reason
          </label>
          <textarea
            className="min-h-[120px] w-full rounded-2xl border border-[#D9E2EC] p-3 text-sm"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Explain what needs to be changed and why"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[#111827]">
            Attach supporting documents
          </label>
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(e.target.files)}
            className="block w-full text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Submitting..." : "Submit request to admin"}
        </button>
      </form>
    </main>
  );
}