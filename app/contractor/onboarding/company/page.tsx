"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeError } from "../../../../lib/errors/normalizeError";
import {
  unwrapSupabase,
  unwrapSupabaseNullable,
} from "../../../../lib/errors/unwrapSupabase";
import { withErrorLogging } from "../../../../lib/errors/withErrorLogging";
import { getMyProfile, UserRole } from "../../../../lib/profile";
import { supabase } from "../../../../lib/supabaseClient";
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

type AppLikeError = Error & {
  code?: string;
  details?: Record<string, unknown>;
};

type ProfileLike = {
  role?: UserRole | null;
} | null;

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

function getSafeErrorMessage(error: unknown, fallback: string) {
  const normalized = normalizeError(error) as AppLikeError;
  const code = String(normalized.code || "");
  const message = String(normalized.message || "").toLowerCase();

  if (code.includes("duplicate") || message.includes("duplicate key")) {
    return "This company record already exists. Please refresh and try again.";
  }

  if (code.includes("not_logged_in")) {
    return "Your session has expired. Please log in again.";
  }

  return fallback;
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

  const [payoutMethodType] = useState("ach");
  const [payoutAccountLabel, setPayoutAccountLabel] = useState("");
  const [payoutContactEmail, setPayoutContactEmail] = useState("");
  const [payoutContactPhone, setPayoutContactPhone] = useState("");
  const [payoutExternalRef, setPayoutExternalRef] = useState("");

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

    setPayoutAccountLabel(c.payout_account_label || "");
    setPayoutContactEmail(c.payout_contact_email || "");
    setPayoutContactPhone(c.payout_contact_phone || "");
    setPayoutExternalRef(c.payout_external_ref || "");

    setHomeMarket(profile?.home_market || "");
    setSelectedMarkets(profile?.markets ?? []);
  }

  async function getOrCreateDraftCompany(userId: string): Promise<Company> {
  let existingResult;
  try {
    existingResult = await supabase
      .from("contractor_companies")
      .select(
        `
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
      `
      )
      .eq("owner_user_id", userId)
      .maybeSingle();
  } catch (error) {
    throw normalizeError(
      error,
      "contractor_onboarding_get_company_query_failed",
      "Unable to query contractor company."
    );
  }

  if (existingResult.error) {
    throw normalizeError(
      existingResult.error,
      "contractor_onboarding_get_company_failed",
      "Unable to load contractor company."
    );
  }

  if (existingResult.data) {
    return existingResult.data as Company;
  }

  let insertResult;
  try {
    insertResult = await supabase
      .from("contractor_companies")
      .insert({
        owner_user_id: userId,
        legal_name: "Draft company",
        onboarding_status: "draft",
        status: "active",
        payout_method_type: "ach",
        insurance_mode: "either",
      })
      .select(
        `
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
      `
      )
      .single();
  } catch (error) {
    throw normalizeError(
      error,
      "contractor_onboarding_create_company_query_failed",
      "Unable to create contractor company."
    );
  }

  if (insertResult.error) {
    throw normalizeError(
      insertResult.error,
      "contractor_onboarding_create_company_failed",
      "Unable to create contractor company."
    );
  }

  if (!insertResult.data) {
    throw normalizeError(
      new Error("Missing inserted company row."),
      "contractor_onboarding_create_company_empty",
      "Unable to create contractor company."
    );
  }

  return insertResult.data as Company;
}

  async function getPublicProfile(
  companyId: string
): Promise<ContractorPublicProfile | null> {
  const result = await supabase
    .from("contractor_public_profiles")
    .select("company_id, home_market, markets, is_listed")
    .eq("company_id", companyId)
    .maybeSingle();

  if (result.error) {
    return null;
  }

  return (result.data as ContractorPublicProfile | null) ?? null;
}

  async function trackOnboardingEventSafely(
    event: string,
    meta: Record<string, unknown>
  ) {
    try {
      await track(event, {
        role: "contractor",
        meta,
      });
    } catch {
      // analytics must never break onboarding UX
    }
  }

  async function loadPage() {
    setLoading(true);
    setErr(null);

    try {
      const result = await withErrorLogging(
        async () => {
          const { data: sessionData, error: sessionError } =
            await supabase.auth.getSession();

          if (sessionError) {
            throw sessionError;
          }

          if (!sessionData.session?.user) {
            router.replace("/login");
            return null;
          }

          const profile = (await getMyProfile()) as ProfileLike;

          if (!profile || profile.role !== "contractor") {
            router.replace("/dashboard");
            return null;
          }

          const draftCompany = await getOrCreateDraftCompany(
            sessionData.session.user.id
          );

          if (draftCompany.onboarding_status !== "draft") {
            router.replace("/contractor");
            return null;
          }

          const publicProfile = await getPublicProfile(draftCompany.id);

          return {
            draftCompany,
            publicProfile,
          };
        },
        {
          message: "contractor_onboarding_load_failed",
          code: "contractor_onboarding_load_failed",
          source: "frontend",
          area: "contractor",
          role: "contractor",
          path: "/contractor/onboarding/company",
        }
      );

      if (!result) {
        return;
      }

      fillForm(result.draftCompany, result.publicProfile);

      void trackOnboardingEventSafely("contractor_onboarding_started", {
        companyId: result.draftCompany.id,
      });
    } catch (error) {
      setErr(
        getSafeErrorMessage(error, "Unable to load onboarding. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

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

    try {
      setSaving(true);

      await withErrorLogging(
        async () => {
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

            payout_method_type: payoutMethodType,
            payout_account_label: payoutAccountLabel.trim() || null,
            payout_contact_email: payoutContactEmail.trim() || null,
            payout_contact_phone: payoutContactPhone.trim() || null,
            payout_external_ref: payoutExternalRef.trim() || null,

            billing_method_type: null,
            billing_account_label: null,
            billing_contact_email: null,
            billing_contact_phone: null,
            billing_external_ref: null,

            billing_provider: null,
            billing_customer_id: null,
            billing_payment_method_id: null,
            billing_card_brand: null,
            billing_last4: null,
            billing_exp_month: null,
            billing_exp_year: null,

            onboarding_status: "submitted" as const,
            submitted_at: new Date().toISOString(),
          };

          unwrapSupabase(
            await supabase
              .from("contractor_companies")
              .update(companyPayload)
              .eq("id", company.id),
            "contractor_onboarding_update_company_failed"
          );

          const profilePayload = {
  company_id: company.id,
  home_market: homeMarket || null,
  markets: uniq(selectedMarkets),
  is_listed: true,
  updated_at: new Date().toISOString(),
};

          unwrapSupabase(
            await supabase
              .from("contractor_public_profiles")
              .upsert(profilePayload, { onConflict: "company_id" }),
            "contractor_onboarding_update_public_profile_failed"
          );

          void trackOnboardingEventSafely("contractor_onboarding_submitted", {
            companyId: company.id,
          });

          router.replace("/contractor");
        },
        {
          message: "contractor_onboarding_submit_failed",
          code: "contractor_onboarding_submit_failed",
          source: "frontend",
          area: "contractor",
          role: "contractor",
          path: "/contractor/onboarding/company",
          details: {
            companyId: company.id,
          },
        }
      );
    } catch (error) {
      setErr(
        getSafeErrorMessage(
          error,
          "Unable to submit onboarding. Please try again."
        )
      );
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
            Fill in your company details. After submit, the company data will be
            locked. Changes will require an admin request.
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
            title="Payout details"
            description="For now, we only collect ACH payout details for contractor payments."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldLabel>Payout method</FieldLabel>
                <TextInput value="ACH" disabled readOnly />
              </div>

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
                  placeholder="Routing number"
                />
              </div>

              <div>
                <FieldLabel>Account number</FieldLabel>
                <TextInput
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="Account number"
                />
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
                  placeholder="Internal payout reference or ACH note"
                />
              </div>
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