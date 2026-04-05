"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { getMyProfile } from "../../../../lib/profile";
import { track } from "../../../../lib/track";

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

  payout_method_type: string | null;
  payout_account_label: string | null;
  payout_contact_email: string | null;
  payout_contact_phone: string | null;
  payout_external_ref: string | null;

  billing_method_type: string | null;
  billing_account_label: string | null;
  billing_contact_email: string | null;
  billing_contact_phone: string | null;
  billing_external_ref: string | null;

  billing_provider: string | null;
  billing_customer_id: string | null;
  billing_payment_method_id: string | null;
  billing_card_brand: string | null;
  billing_last4: string | null;
  billing_exp_month: number | null;
  billing_exp_year: number | null;

  onboarding_status: "draft" | "submitted" | "approved";
};

type ContractorPublicProfile = {
  company_id: string;
  home_market: string | null;
  markets: string[] | null;
  is_listed: boolean | null;
};

const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function last4(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.slice(-4);
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm leading-6 text-[#4B5563]">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-medium text-[#0A2E5C]">
      {children}
      {required ? <span className="text-red-600"> *</span> : null}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="mt-1 w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
    />
  );
}

function SelectInput(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & {
    children: React.ReactNode;
  }
) {
  const { children, ...rest } = props;
  return (
    <select
      {...rest}
      className="mt-1 w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
    >
      {children}
    </select>
  );
}

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

  const [payoutMethodType, setPayoutMethodType] = useState("ach");
  const [payoutAccountLabel, setPayoutAccountLabel] = useState("");
  const [payoutContactEmail, setPayoutContactEmail] = useState("");
  const [payoutContactPhone, setPayoutContactPhone] = useState("");
  const [payoutExternalRef, setPayoutExternalRef] = useState("");

  const [billingMethodType, setBillingMethodType] = useState("debit_card");
  const [billingAccountLabel, setBillingAccountLabel] = useState("");
  const [billingContactEmail, setBillingContactEmail] = useState("");
  const [billingContactPhone, setBillingContactPhone] = useState("");
  const [billingExternalRef, setBillingExternalRef] = useState("");

  const [billingCardholderName, setBillingCardholderName] = useState("");
  const [billingCardNumber, setBillingCardNumber] = useState("");
  const [billingCardSecurityCode, setBillingCardSecurityCode] = useState("");
  const [billingCardExpMonth, setBillingCardExpMonth] = useState("");
  const [billingCardExpYear, setBillingCardExpYear] = useState("");

  const [billingPaypalEmail, setBillingPaypalEmail] = useState("");
  const [billingStripeAccountId, setBillingStripeAccountId] = useState("");
  const [billingBankHolder, setBillingBankHolder] = useState("");
  const [billingBankRouting, setBillingBankRouting] = useState("");
  const [billingBankAccountNumber, setBillingBankAccountNumber] = useState("");

  const [homeMarket, setHomeMarket] = useState("");
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [marketToAdd, setMarketToAdd] = useState("");

  const availableMarkets = useMemo(
    () => US_STATES.filter((s) => !selectedMarkets.includes(s)),
    [selectedMarkets]
  );

  function addMarket(stateName: string) {
    if (!stateName) return;
    setSelectedMarkets((prev) => uniq([...prev, stateName]));
    setMarketToAdd("");
  }

  function removeMarket(stateName: string) {
    setSelectedMarkets((prev) => prev.filter((x) => x !== stateName));
  }

  function fillForm(c: Company, profile: ContractorPublicProfile | null) {
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

    setPayoutMethodType(c.payout_method_type || "ach");
    setPayoutAccountLabel(c.payout_account_label || "");
    setPayoutContactEmail(c.payout_contact_email || "");
    setPayoutContactPhone(c.payout_contact_phone || "");
    setPayoutExternalRef(c.payout_external_ref || "");

    setBillingMethodType(c.billing_method_type || "debit_card");
    setBillingAccountLabel(c.billing_account_label || "");
    setBillingContactEmail(c.billing_contact_email || "");
    setBillingContactPhone(c.billing_contact_phone || "");
    setBillingExternalRef(c.billing_external_ref || "");

    setHomeMarket(profile?.home_market || "");
    setSelectedMarkets(profile?.markets || []);
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
        payout_method_type,
        payout_account_label,
        payout_contact_email,
        payout_contact_phone,
        payout_external_ref,
        billing_method_type,
        billing_account_label,
        billing_contact_email,
        billing_contact_phone,
        billing_external_ref,
        billing_provider,
        billing_customer_id,
        billing_payment_method_id,
        billing_card_brand,
        billing_last4,
        billing_exp_month,
        billing_exp_year,
        onboarding_status
      `)
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (selErr) throw new Error(selErr.message);
    if (existing) return existing as Company;

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
        payout_method_type,
        payout_account_label,
        payout_contact_email,
        payout_contact_phone,
        payout_external_ref,
        billing_method_type,
        billing_account_label,
        billing_contact_email,
        billing_contact_phone,
        billing_external_ref,
        billing_provider,
        billing_customer_id,
        billing_payment_method_id,
        billing_card_brand,
        billing_last4,
        billing_exp_month,
        billing_exp_year,
        onboarding_status
      `)
      .single();

    if (insErr) throw new Error(insErr.message);
    return created as Company;
  }

  async function getPublicProfile(companyId: string): Promise<ContractorPublicProfile | null> {
    const { data, error } = await supabase
      .from("contractor_public_profiles")
      .select("company_id, home_market, markets, is_listed")
      .eq("company_id", companyId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data ?? null) as ContractorPublicProfile | null;
  }

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

      const c = await getOrCreateDraftCompany(data.session.user.id);

      if (c.onboarding_status !== "draft") {
        router.replace("/contractor");
        return;
      }

      const publicProfile = await getPublicProfile(c.id);
      fillForm(c, publicProfile);

      await track("contractor_onboarding_started", {
        role: "contractor",
        meta: {
          companyId: c.id,
        },
      });
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

      if (!homeMarket.trim()) {
        setErr("Home state is required.");
        return;
      }

      if (selectedMarkets.length === 0) {
        setErr("Select at least one working state.");
        return;
      }

      let nextBillingAccountLabel = billingAccountLabel.trim() || null;
      let nextBillingContactEmail = billingContactEmail.trim() || null;
      let nextBillingContactPhone = billingContactPhone.trim() || null;
      let nextBillingExternalRef = billingExternalRef.trim() || null;

      let nextBillingProvider: string | null = null;
      let nextBillingCustomerId: string | null = null;
      let nextBillingPaymentMethodId: string | null = null;
      let nextBillingCardBrand: string | null = null;
      let nextBillingLast4: string | null = null;
      let nextBillingExpMonth: number | null = null;
      let nextBillingExpYear: number | null = null;

      if (billingMethodType === "credit_card" || billingMethodType === "debit_card") {
        if (!billingCardNumber.trim()) {
          setErr("Card number is required for card billing.");
          return;
        }
        if (!billingCardExpMonth.trim() || !billingCardExpYear.trim()) {
          setErr("Card expiration date is required.");
          return;
        }

        const masked = last4(billingCardNumber);
        nextBillingLast4 = masked || null;
        nextBillingExpMonth = Number(billingCardExpMonth) || null;
        nextBillingExpYear = Number(billingCardExpYear) || null;
        nextBillingCardBrand =
          billingMethodType === "credit_card" ? "credit_card" : "debit_card";

        nextBillingAccountLabel =
          nextBillingAccountLabel ||
          `${billingMethodType === "credit_card" ? "Credit card" : "Debit card"} ending ${masked}`;

        nextBillingExternalRef = `ending ${masked}`;
      }

      if (billingMethodType === "paypal") {
        if (!billingPaypalEmail.trim()) {
          setErr("PayPal email is required.");
          return;
        }
        nextBillingContactEmail = billingPaypalEmail.trim();
        nextBillingAccountLabel = nextBillingAccountLabel || "PayPal";
        nextBillingExternalRef = billingPaypalEmail.trim();
      }

      if (billingMethodType === "stripe_connect") {
        if (!billingStripeAccountId.trim()) {
          setErr("Stripe account ID is required.");
          return;
        }
        nextBillingProvider = "stripe";
        nextBillingAccountLabel = nextBillingAccountLabel || "Stripe Connect";
        nextBillingExternalRef = billingStripeAccountId.trim();
      }

      if (billingMethodType === "bank_account") {
        if (!billingBankRouting.trim() || !billingBankAccountNumber.trim()) {
          setErr("Bank routing and account number are required.");
          return;
        }

        const masked = last4(billingBankAccountNumber);
        nextBillingAccountLabel =
          nextBillingAccountLabel ||
          `${billingBankHolder.trim() || "Bank account"} ending ${masked}`;
        nextBillingExternalRef = `ending ${masked}`;
      }

      setSaving(true);

      const companyPayload = {
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

        payout_method_type: payoutMethodType || null,
        payout_account_label: payoutAccountLabel.trim() || null,
        payout_contact_email: payoutContactEmail.trim() || null,
        payout_contact_phone: payoutContactPhone.trim() || null,
        payout_external_ref: payoutExternalRef.trim() || null,

        billing_method_type: billingMethodType || null,
        billing_account_label: nextBillingAccountLabel,
        billing_contact_email: nextBillingContactEmail,
        billing_contact_phone: nextBillingContactPhone,
        billing_external_ref: nextBillingExternalRef,

        billing_provider: nextBillingProvider,
        billing_customer_id: nextBillingCustomerId,
        billing_payment_method_id: nextBillingPaymentMethodId,
        billing_card_brand: nextBillingCardBrand,
        billing_last4: nextBillingLast4,
        billing_exp_month: nextBillingExpMonth,
        billing_exp_year: nextBillingExpYear,

        onboarding_status: "submitted" as const,
        submitted_at: new Date().toISOString(),
      };

      const { error: companyError } = await supabase
        .from("contractor_companies")
        .update(companyPayload)
        .eq("id", company.id);

      if (companyError) throw new Error(companyError.message);

      const profilePayload = {
        company_id: company.id,
        home_market: homeMarket,
        markets: uniq(selectedMarkets),
        is_listed: true,
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase
        .from("contractor_public_profiles")
        .upsert(profilePayload, { onConflict: "company_id" });

      if (profileError) throw new Error(profileError.message);

      await track("contractor_onboarding_submitted", {
        role: "contractor",
        meta: {
          companyId: company.id,
        },
      });

      router.replace("/contractor");
    } catch (e: any) {
      setErr(e.message ?? "Submit error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="text-sm text-[#4B5563]">Loading onboarding...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="LEOTEOR"
              width={24}
              height={24}
              className="h-6 w-6 rounded object-contain"
            />
            <span className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
              Contractor onboarding
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#0A2E5C]">
            Company onboarding
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
            Fill in your company details. After submit, the company data will be locked.
            Changes will require an admin request.
          </p>

          {err ? (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}
        </section>

        <form onSubmit={handleSubmit} className="space-y-6">
          <SectionCard title="Company">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldLabel required>Legal company name</FieldLabel>
                <TextInput
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="e.g., Leoteor LLC"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <FieldLabel>DBA (optional)</FieldLabel>
                <TextInput
                  value={dbaName}
                  onChange={(e) => setDbaName(e.target.value)}
                  placeholder="e.g., IronPeak Build"
                />
              </div>

              <div>
                <FieldLabel>FEIN / Tax ID</FieldLabel>
                <TextInput
                  value={fein}
                  onChange={(e) => setFein(e.target.value)}
                  placeholder="XX-XXXXXXX"
                />
              </div>

              <div>
                <FieldLabel>Phone</FieldLabel>
                <TextInput
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 ..."
                />
              </div>

              <div className="sm:col-span-2">
                <FieldLabel>Email</FieldLabel>
                <TextInput
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="billing@company.com"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Address">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldLabel>Address line 1</FieldLabel>
                <TextInput
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Street address"
                />
              </div>

              <div className="sm:col-span-2">
                <FieldLabel>Address line 2</FieldLabel>
                <TextInput
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Suite / Apt / Unit"
                />
              </div>

              <div>
                <FieldLabel>City</FieldLabel>
                <TextInput value={city} onChange={(e) => setCity(e.target.value)} />
              </div>

              <div>
                <FieldLabel>State</FieldLabel>
                <TextInput
                  value={stateValue}
                  onChange={(e) => setStateValue(e.target.value)}
                  placeholder="GA"
                />
              </div>

              <div>
                <FieldLabel>ZIP</FieldLabel>
                <TextInput value={zip} onChange={(e) => setZip(e.target.value)} />
              </div>

              <div>
                <FieldLabel>Country</FieldLabel>
                <TextInput
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Markets"
            description="Choose your home state and the states where your company is ready to work."
          >
            <div className="grid grid-cols-1 gap-4">
              <div>
                <FieldLabel required>Home state</FieldLabel>
                <SelectInput
                  value={homeMarket}
                  onChange={(e) => setHomeMarket(e.target.value)}
                >
                  <option value="">Select home state</option>
                  {US_STATES.map((stateName) => (
                    <option key={stateName} value={stateName}>
                      {stateName}
                    </option>
                  ))}
                </SelectInput>
              </div>

              <div>
                <FieldLabel required>States where you can work</FieldLabel>

                <div className="mt-1 flex gap-2">
                  <select
                    value={marketToAdd}
                    onChange={(e) => setMarketToAdd(e.target.value)}
                    className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                  >
                    <option value="">Select a state</option>
                    {availableMarkets.map((stateName) => (
                      <option key={stateName} value={stateName}>
                        {stateName}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => addMarket(marketToAdd)}
                    className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                  >
                    Add
                  </button>
                </div>

                {selectedMarkets.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedMarkets.map((stateName) => (
                      <button
                        key={stateName}
                        type="button"
                        onClick={() => removeMarket(stateName)}
                        className="rounded-full border border-[#D9E2EC] bg-[#F8FAFC] px-3 py-1 text-sm text-[#111827]"
                        title="Remove"
                      >
                        {stateName} ×
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[#4B5563]">
                    No working states selected yet.
                  </p>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Payout & ACH details"
            description="These details are used for contractor payouts, ACH paperwork, and agreement data between customer and contractor."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldLabel>Account holder</FieldLabel>
                <TextInput
                  value={bankAccountHolder}
                  onChange={(e) => setBankAccountHolder(e.target.value)}
                  placeholder="Company legal name"
                />
              </div>

              <div>
                <FieldLabel>Routing number</FieldLabel>
                <TextInput
                  value={bankRouting}
                  onChange={(e) => setBankRouting(e.target.value)}
                />
              </div>

              <div>
                <FieldLabel>Account number</FieldLabel>
                <TextInput
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <FieldLabel>Payout method</FieldLabel>
                <SelectInput
                  value={payoutMethodType}
                  onChange={(e) => setPayoutMethodType(e.target.value)}
                >
                  <option value="ach">ACH</option>
                  <option value="wire">Wire transfer</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="paypal">PayPal</option>
                  <option value="zelle">Zelle</option>
                  <option value="other">Other</option>
                </SelectInput>
              </div>

              <div className="sm:col-span-2">
                <FieldLabel>Account label / nickname</FieldLabel>
                <TextInput
                  value={payoutAccountLabel}
                  onChange={(e) => setPayoutAccountLabel(e.target.value)}
                  placeholder="e.g., Main operating account"
                />
              </div>

              <div>
                <FieldLabel>Payments email</FieldLabel>
                <TextInput
                  value={payoutContactEmail}
                  onChange={(e) => setPayoutContactEmail(e.target.value)}
                  placeholder="ap@company.com"
                />
              </div>

              <div>
                <FieldLabel>Payments phone</FieldLabel>
                <TextInput
                  value={payoutContactPhone}
                  onChange={(e) => setPayoutContactPhone(e.target.value)}
                  placeholder="+1 ..."
                />
              </div>

              <div className="sm:col-span-2">
                <FieldLabel>External payout reference</FieldLabel>
                <TextInput
                  value={payoutExternalRef}
                  onChange={(e) => setPayoutExternalRef(e.target.value)}
                  placeholder="Internal payout account name, processor reference, or other note"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Marketplace billing method"
            description="Choose how your company will pay marketplace fees and services. Sensitive card data should later go directly to the payment processor."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldLabel>Billing method</FieldLabel>
                <SelectInput
                  value={billingMethodType}
                  onChange={(e) => setBillingMethodType(e.target.value)}
                >
                  <option value="debit_card">Debit card</option>
                  <option value="credit_card">Credit card</option>
                  <option value="bank_account">Bank account</option>
                  <option value="paypal">PayPal</option>
                  <option value="stripe_connect">Stripe Connect</option>
                  <option value="other">Other</option>
                </SelectInput>
              </div>

              {(billingMethodType === "credit_card" ||
                billingMethodType === "debit_card") && (
                <>
                  <div className="sm:col-span-2">
                    <FieldLabel>Cardholder name</FieldLabel>
                    <TextInput
                      value={billingCardholderName}
                      onChange={(e) => setBillingCardholderName(e.target.value)}
                      placeholder="Name on card"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <FieldLabel required>Card number</FieldLabel>
                    <TextInput
                      value={billingCardNumber}
                      onChange={(e) => setBillingCardNumber(e.target.value)}
                      placeholder="•••• •••• •••• ••••"
                      inputMode="numeric"
                    />
                  </div>

                  <div>
                    <FieldLabel required>Expiration month</FieldLabel>
                    <TextInput
                      value={billingCardExpMonth}
                      onChange={(e) => setBillingCardExpMonth(e.target.value)}
                      placeholder="MM"
                      inputMode="numeric"
                    />
                  </div>

                  <div>
                    <FieldLabel required>Expiration year</FieldLabel>
                    <TextInput
                      value={billingCardExpYear}
                      onChange={(e) => setBillingCardExpYear(e.target.value)}
                      placeholder="YYYY"
                      inputMode="numeric"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <FieldLabel>Security code</FieldLabel>
                    <TextInput
                      value={billingCardSecurityCode}
                      onChange={(e) => setBillingCardSecurityCode(e.target.value)}
                      placeholder="CVV / CVC"
                      inputMode="numeric"
                    />
                  </div>
                </>
              )}

              {billingMethodType === "paypal" && (
                <div className="sm:col-span-2">
                  <FieldLabel required>PayPal email</FieldLabel>
                  <TextInput
                    value={billingPaypalEmail}
                    onChange={(e) => setBillingPaypalEmail(e.target.value)}
                    placeholder="paypal@company.com"
                  />
                </div>
              )}

              {billingMethodType === "stripe_connect" && (
                <div className="sm:col-span-2">
                  <FieldLabel required>Stripe account ID</FieldLabel>
                  <TextInput
                    value={billingStripeAccountId}
                    onChange={(e) => setBillingStripeAccountId(e.target.value)}
                    placeholder="acct_..."
                  />
                </div>
              )}

              {billingMethodType === "bank_account" && (
                <>
                  <div className="sm:col-span-2">
                    <FieldLabel>Account holder</FieldLabel>
                    <TextInput
                      value={billingBankHolder}
                      onChange={(e) => setBillingBankHolder(e.target.value)}
                      placeholder="Account holder name"
                    />
                  </div>

                  <div>
                    <FieldLabel required>Routing number</FieldLabel>
                    <TextInput
                      value={billingBankRouting}
                      onChange={(e) => setBillingBankRouting(e.target.value)}
                      placeholder="Routing number"
                    />
                  </div>

                  <div>
                    <FieldLabel required>Account number</FieldLabel>
                    <TextInput
                      value={billingBankAccountNumber}
                      onChange={(e) =>
                        setBillingBankAccountNumber(e.target.value)
                      }
                      placeholder="Account number"
                    />
                  </div>
                </>
              )}

              {billingMethodType === "other" && (
                <>
                  <div className="sm:col-span-2">
                    <FieldLabel>Billing account label</FieldLabel>
                    <TextInput
                      value={billingAccountLabel}
                      onChange={(e) => setBillingAccountLabel(e.target.value)}
                      placeholder="Describe billing method"
                    />
                  </div>

                  <div>
                    <FieldLabel>Billing email</FieldLabel>
                    <TextInput
                      value={billingContactEmail}
                      onChange={(e) => setBillingContactEmail(e.target.value)}
                      placeholder="billing@company.com"
                    />
                  </div>

                  <div>
                    <FieldLabel>Billing phone</FieldLabel>
                    <TextInput
                      value={billingContactPhone}
                      onChange={(e) => setBillingContactPhone(e.target.value)}
                      placeholder="+1 ..."
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <FieldLabel>Billing external reference</FieldLabel>
                    <TextInput
                      value={billingExternalRef}
                      onChange={(e) => setBillingExternalRef(e.target.value)}
                      placeholder="Safe reference or identifier"
                    />
                  </div>
                </>
              )}
            </div>
          </SectionCard>

          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-[#4B5563]">
                Status: <span className="font-medium text-[#111827]">draft</span>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl bg-[#1F6FB5] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0A2E5C] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Submit & lock company data"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}