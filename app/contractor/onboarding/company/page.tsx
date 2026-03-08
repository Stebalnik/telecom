"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { getMyProfile } from "../../../../lib/profile";

type Company = {
  id: string;
  owner_user_id: string;
  legal_name: string;
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

  onboarding_status: "draft" | "submitted" | "approved";
};

export default function ContractorCompanyOnboardingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  function fillForm(c: Company) {
    setCompany(c);
    setLegalName(c.legal_name === "Draft company" ? "" : c.legal_name || "");
    setDbaName(c.dba_name || "");
    setFein(c.fein || "");
    setPhone(c.phone || "");
    setEmail(c.email || "");

    setAddressLine1(c.address_line1 || "");
    setAddressLine2(c.address_line2 || "");
    setCity(c.city || "");
    setStateValue(c.state || "");
    setZip(c.zip || "");
    setCountry(c.country || "US");

    setBankAccountHolder(c.bank_account_holder || "");
    setBankRouting(c.bank_routing || "");
    setBankAccount(c.bank_account || "");
  }

  async function getOrCreateDraftCompany(userId: string): Promise<Company> {
    const { data: existing, error: selErr } = await supabase
      .from("contractor_companies")
      .select(`
        id,
        owner_user_id,
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
        bank_account,
        onboarding_status
      `)
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (selErr) throw new Error(selErr.message);

    if (existing) {
      return existing as Company;
    }

    const { data: created, error: insErr } = await supabase
      .from("contractor_companies")
      .insert({
        owner_user_id: userId,
        legal_name: "Draft company",
        onboarding_status: "draft",
        status: "active",
      })
      .select(`
        id,
        owner_user_id,
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
        bank_account,
        onboarding_status
      `)
      .single();

    if (insErr) throw new Error(insErr.message);

    return created as Company;
  }

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

      if (!profile || profile.role !== "contractor") {
        router.replace("/dashboard");
        return;
      }

      const c = await getOrCreateDraftCompany(data.user.id);

      if (c.onboarding_status !== "draft") {
        router.replace("/contractor");
        return;
      }

      fillForm(c);
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

    try {
      if (!company) {
        setErr("Company draft was not created.");
        return;
      }

      if (!legalName.trim()) {
        setErr("Company legal name is required.");
        return;
      }

      setSaving(true);

      const payload = {
        legal_name: legalName.trim(),
        dba_name: dbaName.trim() || null,

        fein: fein.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,

        address_line1: addressLine1.trim() || null,
        address_line2: addressLine2.trim() || null,
        city: city.trim() || null,
        state: stateValue.trim() || null,
        zip: zip.trim() || null,
        country: country.trim() || "US",

        bank_account_holder: bankAccountHolder.trim() || null,
        bank_routing: bankRouting.trim() || null,
        bank_account: bankAccount.trim() || null,

        onboarding_status: "submitted" as const,
        submitted_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("contractor_companies")
        .update(payload)
        .eq("id", company.id);

      if (error) throw new Error(error.message);

      router.replace("/contractor");
    } catch (e: any) {
      setErr(e.message ?? "Submit error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-3xl p-6">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Contractor onboarding</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Fill in your company details. After submit, the company data will be locked.
        Changes will require an admin request.
      </p>

      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <section className="rounded-lg border p-4">
          <h2 className="text-lg font-medium">Company</h2>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">
                Legal company name <span className="text-red-600">*</span>
              </label>
              <input
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2"
                placeholder="e.g., Leoteor LLC"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-medium">DBA (optional)</label>
              <input
                value={dbaName}
                onChange={(e) => setDbaName(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2"
                placeholder="e.g., IronPeak Build"
              />
            </div>

            <div>
              <label className="text-sm font-medium">FEIN / Tax ID</label>
              <input
                value={fein}
                onChange={(e) => setFein(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2"
                placeholder="XX-XXXXXXX"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2"
                placeholder="+1 ..."
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2"
                placeholder="billing@company.com"
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-lg font-medium">Address</h2>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Address line 1</label>
              <input
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2"
                placeholder="Street address"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Address line 2</label>
              <input
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2"
                placeholder="Suite / Apt / Unit"
              />
            </div>

            <div>
              <label className="text-sm font-medium">City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">State</label>
              <input
                value={stateValue}
                onChange={(e) => setStateValue(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2"
                placeholder="GA"
              />
            </div>

            <div>
              <label className="text-sm font-medium">ZIP</label>
              <input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Country</label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-lg font-medium">Banking (for payouts)</h2>
          <p className="mt-1 text-sm text-neutral-600">
            You can keep this minimal for MVP.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Account holder</label>
              <input
                value={bankAccountHolder}
                onChange={(e) => setBankAccountHolder(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2"
                placeholder="Company legal name"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Routing number</label>
              <input
                value={bankRouting}
                onChange={(e) => setBankRouting(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Account number</label>
              <input
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-600">
            Status: <span className="font-medium">draft</span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-black px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Submit & lock company data"}
          </button>
        </div>
      </form>
    </div>
  );
}