"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeError } from "../../../lib/errors/normalizeError";
import { withErrorLogging } from "../../../lib/errors/withErrorLogging";
import { getMyProfile } from "../../../lib/profile";
import {
  ensureMyCompanyDraft,
  getMyCompany,
  saveMyCompanyDraft,
  submitMyCompanyForReview,
  type ContractorOnboardingDraftInput,
} from "../../../lib/contractor";
import { supabase } from "../../../lib/supabaseClient";

type AppLikeError = Error & {
  code?: string;
  details?: Record<string, unknown>;
};

type ContractorOnboardingForm = {
  legal_name: string;
  dba_name: string;
  headline: string;
  home_market: string;
  markets: string;
  insurance_mode: string;
  fein: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  payout_method_type: string;
  payout_account_label: string;
  payout_contact_email: string;
  payout_contact_phone: string;
  payout_external_ref: string;
};

type ContractorOnboardingPageProfile = {
  role?: string | null;
} | null;

const AUTOSAVE_DELAY_MS = 900;

function createEmptyForm(): ContractorOnboardingForm {
  return {
    legal_name: "",
    dba_name: "",
    headline: "",
    home_market: "",
    markets: "",
    insurance_mode: "either",
    fein: "",
    phone: "",
    email: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
    payout_method_type: "ach",
    payout_account_label: "",
    payout_contact_email: "",
    payout_contact_phone: "",
    payout_external_ref: "",
  };
}

function normalizePublicProfile(
  publicProfile:
    | {
        headline?: string | null;
        home_market?: string | null;
        markets?: string[] | null;
      }
    | {
        headline?: string | null;
        home_market?: string | null;
        markets?: string[] | null;
      }[]
    | null
    | undefined
) {
  return Array.isArray(publicProfile) ? publicProfile[0] ?? null : publicProfile;
}

function mapCompanyToForm(company: any | null | undefined): ContractorOnboardingForm {
  const publicProfile = normalizePublicProfile(company?.public_profile);

  return {
    legal_name: company?.legal_name || "",
    dba_name: company?.dba_name || "",
    headline: publicProfile?.headline || "",
    home_market: publicProfile?.home_market || "",
    markets: Array.isArray(publicProfile?.markets)
      ? publicProfile.markets.join(", ")
      : "",
    insurance_mode: company?.insurance_mode || "either",
    fein: company?.fein || "",
    phone: company?.phone || "",
    email: company?.email || "",
    address_line1: company?.address_line1 || "",
    address_line2: company?.address_line2 || "",
    city: company?.city || "",
    state: company?.state || "",
    zip: company?.zip || "",
    country: company?.country || "US",
    payout_method_type: company?.payout_method_type || "ach",
    payout_account_label: company?.payout_account_label || "",
    payout_contact_email: company?.payout_contact_email || "",
    payout_contact_phone: company?.payout_contact_phone || "",
    payout_external_ref: company?.payout_external_ref || "",
  };
}

function parseMarkets(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function buildDraftInput(form: ContractorOnboardingForm): ContractorOnboardingDraftInput {
  return {
    legal_name: form.legal_name,
    dba_name: form.dba_name,
    fein: form.fein,
    phone: form.phone,
    email: form.email,
    address_line1: form.address_line1,
    address_line2: form.address_line2,
    city: form.city,
    state: form.state,
    zip: form.zip,
    country: form.country,
    insurance_mode: form.insurance_mode,
    payout_method_type: form.payout_method_type,
    payout_account_label: form.payout_account_label,
    payout_contact_email: form.payout_contact_email,
    payout_contact_phone: form.payout_contact_phone,
    payout_external_ref: form.payout_external_ref,
    headline: form.headline,
    home_market: form.home_market,
    markets: parseMarkets(form.markets),
  } as ContractorOnboardingDraftInput;
}

function areFormsEqual(
  a: ContractorOnboardingForm,
  b: ContractorOnboardingForm
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function getSafeOnboardingErrorMessage(
  error: unknown,
  fallback: string
): string {
  const normalized = normalizeError(error) as AppLikeError;
  const code = String(normalized.code || "");

  if (code.includes("not_logged_in")) {
    return "Your session has expired. Please log in again.";
  }

  if (code.includes("duplicate")) {
    return "This contractor draft already exists. Please refresh and continue.";
  }

  return fallback;
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#4B5563]">{description}</p>
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-[#111827]">
        {label}
        {required ? " *" : ""}
      </div>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-2xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export default function ContractorOnboardingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [form, setForm] = useState<ContractorOnboardingForm>(createEmptyForm());
  const [lastSavedForm, setLastSavedForm] = useState<ContractorOnboardingForm>(
    createEmptyForm()
  );
  const [hasLoadedInitialDraft, setHasLoadedInitialDraft] = useState(false);

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dirty = useMemo(
    () => !areFormsEqual(form, lastSavedForm),
    [form, lastSavedForm]
  );

  function updateField<K extends keyof ContractorOnboardingForm>(
    key: K,
    value: ContractorOnboardingForm[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
    setErr(null);
    setSaveMessage(null);
  }

  function setTransientSaveMessage(message: string) {
    setSaveMessage(message);

    if (saveMessageTimerRef.current) {
      clearTimeout(saveMessageTimerRef.current);
    }

    saveMessageTimerRef.current = setTimeout(() => {
      setSaveMessage(null);
    }, 2500);
  }

  async function performDraftSave(nextForm: ContractorOnboardingForm) {
    const payload = buildDraftInput(nextForm);

    const savedCompany = await withErrorLogging(
      async () => await saveMyCompanyDraft(payload),
      {
        message: "contractor_onboarding_save_draft_failed",
        code: "contractor_onboarding_save_draft_failed",
        source: "frontend",
        area: "contractor",
        role: "contractor",
        path: "/contractor/onboarding",
      }
    );

    const savedForm = mapCompanyToForm(savedCompany);

    setLastSavedForm(savedForm);
    setForm(savedForm);
  }

  async function handleManualSave() {
    setSavingDraft(true);
    setErr(null);

    try {
      await performDraftSave(form);
      setTransientSaveMessage("Draft saved.");
    } catch (error) {
      setErr(
        getSafeOnboardingErrorMessage(
          error,
          "Unable to save draft. Please try again."
        )
      );
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleSubmitForReview() {
    setSubmitting(true);
    setErr(null);
    setSaveMessage(null);

    try {
      const payload = buildDraftInput(form);

      const submittedCompany = await withErrorLogging(
        async () => await submitMyCompanyForReview(payload),
        {
          message: "contractor_onboarding_submit_failed",
          code: "contractor_onboarding_submit_failed",
          source: "frontend",
          area: "contractor",
          role: "contractor",
          path: "/contractor/onboarding",
        }
      );

      const submittedForm = mapCompanyToForm(submittedCompany);
      setLastSavedForm(submittedForm);
      setForm(submittedForm);

      router.replace("/contractor/onboarding/pending");
    } catch (error) {
      setErr(
        getSafeOnboardingErrorMessage(
          error,
          "Unable to submit onboarding for review. Please try again."
        )
      );
      setSubmitting(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      setLoading(true);
      setErr(null);

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
            message: "contractor_onboarding_session_load_failed",
            code: "contractor_onboarding_session_load_failed",
            source: "frontend",
            area: "contractor",
            role: "contractor",
            path: "/contractor/onboarding",
          }
        );

        if (!mounted) return;

        if (!sessionResult.data.session?.user) {
          router.replace("/login");
          return;
        }

        const profile = (await withErrorLogging(
          async () => (await getMyProfile()) as ContractorOnboardingPageProfile,
          {
            message: "contractor_onboarding_profile_load_failed",
            code: "contractor_onboarding_profile_load_failed",
            source: "frontend",
            area: "contractor",
            role: "contractor",
            path: "/contractor/onboarding",
          }
        )) as ContractorOnboardingPageProfile;

        if (!mounted) return;

        if (!profile || profile.role !== "contractor") {
          router.replace("/dashboard");
          return;
        }

        const existingCompany = await withErrorLogging(
          async () => await getMyCompany(),
          {
            message: "contractor_onboarding_company_load_failed",
            code: "contractor_onboarding_company_load_failed",
            source: "frontend",
            area: "contractor",
            role: "contractor",
            path: "/contractor/onboarding",
          }
        );

        if (!mounted) return;

        if (existingCompany?.onboarding_status === "submitted") {
          router.replace("/contractor/onboarding/pending");
          return;
        }

        if (existingCompany?.onboarding_status === "approved") {
          router.replace("/contractor");
          return;
        }

        const companyDraft =
          existingCompany ||
          (await withErrorLogging(
            async () => await ensureMyCompanyDraft(),
            {
              message: "contractor_onboarding_ensure_draft_failed",
              code: "contractor_onboarding_ensure_draft_failed",
              source: "frontend",
              area: "contractor",
              role: "contractor",
              path: "/contractor/onboarding",
            }
          ));

        if (!mounted) return;

        const initialForm = mapCompanyToForm(companyDraft);
        setForm(initialForm);
        setLastSavedForm(initialForm);
        setHasLoadedInitialDraft(true);
      } catch (error) {
        if (!mounted) return;
        setErr(
          getSafeOnboardingErrorMessage(
            error,
            "Unable to load contractor onboarding. Please refresh and try again."
          )
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!hasLoadedInitialDraft) {
      return;
    }

    if (!dirty || savingDraft || submitting) {
      return;
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      void (async () => {
        try {
          await performDraftSave(form);
          setTransientSaveMessage("Draft auto-saved.");
        } catch {
          setErr("Unable to auto-save draft. Your changes are still on this page.");
        }
      })();
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [dirty, form, hasLoadedInitialDraft, savingDraft, submitting]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }

      if (saveMessageTimerRef.current) {
        clearTimeout(saveMessageTimerRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">
            Loading contractor onboarding...
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
              Contractor onboarding
            </div>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#0A2E5C]">
              Company onboarding
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#4B5563]">
              Fill in your company details. You can save a draft at any time.
              After you submit for review, your contractor workspace will stay
              locked until admin approval.
            </p>
          </div>

          <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] px-4 py-3 text-sm text-[#4B5563]">
            {dirty ? "Unsaved changes" : "All changes saved"}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 font-medium text-[#0A2E5C] transition hover:bg-[#F4F8FC]"
          >
            Terms of Use
          </Link>

          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 font-medium text-[#0A2E5C] transition hover:bg-[#F4F8FC]"
          >
            Privacy Policy
          </Link>

          <Link
            href="/contractor-agreement"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 font-medium text-[#0A2E5C] transition hover:bg-[#F4F8FC]"
          >
            Contractor Agreement
          </Link>
        </div>
      </section>

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      {saveMessage ? (
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 shadow-sm">
          {saveMessage}
        </section>
      ) : null}

      <SectionCard
        title="Company"
        description="Basic legal and marketplace profile information."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Legal company name" required>
            <Input
              value={form.legal_name}
              onChange={(value) => updateField("legal_name", value)}
              placeholder="e.g. Vertex Base Inc"
            />
          </Field>

          <Field label="DBA">
            <Input
              value={form.dba_name}
              onChange={(value) => updateField("dba_name", value)}
              placeholder="e.g. IronPeak Build"
            />
          </Field>

          <Field label="Headline">
            <Input
              value={form.headline}
              onChange={(value) => updateField("headline", value)}
              placeholder="Short company headline"
            />
          </Field>

          <Field label="Insurance mode">
            <Select
              value={form.insurance_mode}
              onChange={(value) => updateField("insurance_mode", value)}
              options={[
                { value: "either", label: "Either" },
                { value: "company", label: "Company only" },
                { value: "team", label: "Team only" },
              ]}
            />
          </Field>

          <Field label="Home market">
            <Input
              value={form.home_market}
              onChange={(value) => updateField("home_market", value)}
              placeholder="e.g. Georgia"
            />
          </Field>

          <Field label="Markets">
            <Input
              value={form.markets}
              onChange={(value) => updateField("markets", value)}
              placeholder="e.g. Florida, Alabama, North Carolina"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Company contact"
        description="Primary legal and operating contact information."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="FEIN / Tax ID">
            <Input
              value={form.fein}
              onChange={(value) => updateField("fein", value)}
              placeholder="XX-XXXXXXX"
            />
          </Field>

          <Field label="Phone">
            <Input
              value={form.phone}
              onChange={(value) => updateField("phone", value)}
              placeholder="+1 ..."
            />
          </Field>

          <Field label="Email">
            <Input
              value={form.email}
              onChange={(value) => updateField("email", value)}
              placeholder="billing@company.com"
              type="email"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Address"
        description="Company legal address used for records and agreements."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Address line 1">
            <Input
              value={form.address_line1}
              onChange={(value) => updateField("address_line1", value)}
              placeholder="Street address"
            />
          </Field>

          <Field label="Address line 2">
            <Input
              value={form.address_line2}
              onChange={(value) => updateField("address_line2", value)}
              placeholder="Suite / Apt / Unit"
            />
          </Field>

          <Field label="City">
            <Input
              value={form.city}
              onChange={(value) => updateField("city", value)}
              placeholder="City"
            />
          </Field>

          <Field label="State">
            <Input
              value={form.state}
              onChange={(value) => updateField("state", value)}
              placeholder="GA"
            />
          </Field>

          <Field label="ZIP">
            <Input
              value={form.zip}
              onChange={(value) => updateField("zip", value)}
              placeholder="ZIP"
            />
          </Field>

          <Field label="Country">
            <Input
              value={form.country}
              onChange={(value) => updateField("country", value)}
              placeholder="US"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Payout"
        description="Payout method and payout contact details."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Payout method">
            <Select
              value={form.payout_method_type}
              onChange={(value) => updateField("payout_method_type", value)}
              options={[
                { value: "ach", label: "ACH" },
                { value: "debit_card", label: "Debit card" },
                { value: "other", label: "Other" },
              ]}
            />
          </Field>

          <Field label="Payout account label">
            <Input
              value={form.payout_account_label}
              onChange={(value) => updateField("payout_account_label", value)}
              placeholder="e.g. Main operating account"
            />
          </Field>

          <Field label="Payout contact email">
            <Input
              value={form.payout_contact_email}
              onChange={(value) => updateField("payout_contact_email", value)}
              placeholder="payments@company.com"
              type="email"
            />
          </Field>

          <Field label="Payout contact phone">
            <Input
              value={form.payout_contact_phone}
              onChange={(value) => updateField("payout_contact_phone", value)}
              placeholder="+1 ..."
            />
          </Field>

          <Field label="Payout external reference">
            <Input
              value={form.payout_external_ref}
              onChange={(value) => updateField("payout_external_ref", value)}
              placeholder="Optional reference"
            />
          </Field>
        </div>
      </SectionCard>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">
              Save or submit
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#4B5563]">
              Save a draft and continue later, or submit your company for admin
              review when ready.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleManualSave()}
              disabled={savingDraft || submitting}
              className="rounded-xl border border-[#D9E2EC] bg-white px-5 py-3 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingDraft ? "Saving..." : "Save draft"}
            </button>

            <button
              type="button"
              onClick={() => void handleSubmitForReview()}
              disabled={savingDraft || submitting || !form.legal_name.trim()}
              className="rounded-xl bg-[#2EA3FF] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#1F6FB5] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit for review"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}