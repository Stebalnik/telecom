"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase/browser";
import { getMyProfile } from "../../../lib/profile";
import {
  ensureMyCustomerOrg,
  getMyCustomerOrg,
  isCustomerOnboardingPending,
  isCustomerWorkspaceApproved,
  submitMyCustomerOrgForReview,
  updateMyCustomerOrgDraft,
} from "../../../lib/customers";
import { normalizeError } from "../../../lib/errors/normalizeError";

type AppLikeError = Error & {
  code?: string;
  details?: Record<string, unknown>;
};

function getSafeErrorMessage(error: unknown, fallback: string) {
  const normalized = normalizeError(error) as AppLikeError;
  const code = String(normalized.code || "");
  const message = String(normalized.message || "").toLowerCase();

  if (code.includes("duplicate") || message.includes("duplicate key")) {
    return "This customer profile already exists. Please refresh and try again.";
  }

  if (code.includes("not_logged_in")) {
    return "Your session has expired. Please log in again.";
  }

  if (code.includes("name_required")) {
    return "Company name is required.";
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

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="mt-1 min-h-[140px] w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
    />
  );
}

export default function CustomerOnboardingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);

  const [orgId, setOrgId] = useState<string | null>(null);

  const [marketplaceName, setMarketplaceName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [dbaName, setDbaName] = useState("");
  const [description, setDescription] = useState("");

  const [fein, setFein] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("US");

  const [projectContactName, setProjectContactName] = useState("");
  const [projectContactTitle, setProjectContactTitle] = useState("");
  const [projectContactEmail, setProjectContactEmail] = useState("");
  const [projectContactPhone, setProjectContactPhone] = useState("");

  const [activationNotificationPhone, setActivationNotificationPhone] =
    useState("");

  const hasHydrated = useRef(false);
  const lastSavedSnapshot = useRef<string>("");

  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        marketplaceName: marketplaceName.trim(),
        companyName: companyName.trim(),
        legalName: legalName.trim(),
        dbaName: dbaName.trim(),
        description: description.trim(),
        fein: fein.trim(),
        phone: phone.trim(),
        email: email.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        city: city.trim(),
        stateValue: stateValue.trim(),
        zip: zip.trim(),
        country: country.trim(),
        projectContactName: projectContactName.trim(),
        projectContactTitle: projectContactTitle.trim(),
        projectContactEmail: projectContactEmail.trim(),
        projectContactPhone: projectContactPhone.trim(),
        activationNotificationPhone: activationNotificationPhone.trim(),
      }),
    [
      marketplaceName,
      companyName,
      legalName,
      dbaName,
      description,
      fein,
      phone,
      email,
      addressLine1,
      addressLine2,
      city,
      stateValue,
      zip,
      country,
      projectContactName,
      projectContactTitle,
      projectContactEmail,
      projectContactPhone,
      activationNotificationPhone,
    ]
  );

  const isDirty =
    hasHydrated.current && currentSnapshot !== lastSavedSnapshot.current;

  function applyOrgToForm(org: Awaited<ReturnType<typeof getMyCustomerOrg>>) {
    if (!org) return;

    setOrgId(org.id);
    setMarketplaceName(org.name || "");
    setCompanyName(org.company_name || "");
    setLegalName(org.legal_name || "");
    setDbaName(org.dba_name || "");
    setDescription(org.description || "");

    setFein(org.fein || "");
    setPhone(org.phone || "");
    setEmail(org.email || "");

    setAddressLine1(org.address_line1 || "");
    setAddressLine2(org.address_line2 || "");
    setCity(org.city || "");
    setStateValue(org.state || "");
    setZip(org.zip || "");
    setCountry(org.country || "US");

    setProjectContactName(org.project_contact_name || "");
    setProjectContactTitle(org.project_contact_title || "");
    setProjectContactEmail(org.project_contact_email || "");
    setProjectContactPhone(org.project_contact_phone || "");

    setActivationNotificationPhone(org.activation_notification_phone || "");

    const snapshot = JSON.stringify({
      marketplaceName: org.name || "",
      companyName: org.company_name || "",
      legalName: org.legal_name || "",
      dbaName: org.dba_name || "",
      description: org.description || "",
      fein: org.fein || "",
      phone: org.phone || "",
      email: org.email || "",
      addressLine1: org.address_line1 || "",
      addressLine2: org.address_line2 || "",
      city: org.city || "",
      stateValue: org.state || "",
      zip: org.zip || "",
      country: org.country || "US",
      projectContactName: org.project_contact_name || "",
      projectContactTitle: org.project_contact_title || "",
      projectContactEmail: org.project_contact_email || "",
      projectContactPhone: org.project_contact_phone || "",
      activationNotificationPhone: org.activation_notification_phone || "",
    });

    lastSavedSnapshot.current = snapshot;
    hasHydrated.current = true;
  }

  async function saveDraft(showSuccess = false) {
    if (!orgId) return;
    if (!marketplaceName.trim() || !companyName.trim()) return;

    setSavingDraft(true);
    setSaveNote(showSuccess ? null : "Saving draft...");

    try {
      const updated = await updateMyCustomerOrgDraft({
        name: marketplaceName,
        company_name: companyName,
        legal_name: legalName || null,
        dba_name: dbaName || null,
        description: description || null,
        fein: fein || null,
        phone: phone || null,
        email: email || null,
        address_line1: addressLine1 || null,
        address_line2: addressLine2 || null,
        city: city || null,
        state: stateValue || null,
        zip: zip || null,
        country: country || null,
        project_contact_name: projectContactName || null,
        project_contact_title: projectContactTitle || null,
        project_contact_email: projectContactEmail || null,
        project_contact_phone: projectContactPhone || null,
        activation_notification_phone: activationNotificationPhone || null,
      });

      applyOrgToForm(updated);
      setErr(null);
      setSaveNote(showSuccess ? "Draft saved." : "All changes saved.");
    } catch (error) {
      setSaveNote(null);
      if (showSuccess) {
        setErr(
          getSafeErrorMessage(
            error,
            "Unable to save draft. Please try again."
          )
        );
      }
    } finally {
      setSavingDraft(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setErr(null);
      setSaveNote(null);

      try {
        const sessionResult = await supabase.auth.getSession();

        if (!active) return;

        if (sessionResult.error) {
          throw sessionResult.error;
        }

        if (!sessionResult.data.session?.user) {
          router.replace("/login");
          return;
        }

        const profile = await getMyProfile();

        if (!active) return;

        if (!profile || profile.role !== "customer") {
          router.replace("/dashboard");
          return;
        }

        const existing = await getMyCustomerOrg();

        if (!active) return;

        if (existing && isCustomerWorkspaceApproved(existing)) {
          router.replace("/customer");
          return;
        }

        if (existing && isCustomerOnboardingPending(existing)) {
          router.replace("/customer/onboarding/pending");
          return;
        }

        const draft = existing ?? (await ensureMyCustomerOrg());

        if (!active) return;

        applyOrgToForm(draft);
      } catch (error) {
        if (!active) return;

        setErr(
          getSafeErrorMessage(
            error,
            "Unable to load customer onboarding. Please try again."
          )
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!hasHydrated.current) return;
    if (!isDirty) return;
    if (!orgId) return;
    if (!marketplaceName.trim() || !companyName.trim()) return;
    if (submitting) return;

    const timer = window.setTimeout(() => {
      void saveDraft(false);
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [currentSnapshot, isDirty, orgId, marketplaceName, companyName, submitting]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!marketplaceName.trim()) {
      setErr("Marketplace company name is required.");
      return;
    }

    if (!companyName.trim()) {
      setErr("Legal / company name is required.");
      return;
    }

    setSubmitting(true);
    setSaveNote(null);

    try {
      await submitMyCustomerOrgForReview({
        name: marketplaceName,
        company_name: companyName,
        legal_name: legalName || null,
        dba_name: dbaName || null,
        description: description || null,
        fein: fein || null,
        phone: phone || null,
        email: email || null,
        address_line1: addressLine1 || null,
        address_line2: addressLine2 || null,
        city: city || null,
        state: stateValue || null,
        zip: zip || null,
        country: country || null,
        project_contact_name: projectContactName || null,
        project_contact_title: projectContactTitle || null,
        project_contact_email: projectContactEmail || null,
        project_contact_phone: projectContactPhone || null,
        activation_notification_phone: activationNotificationPhone || null,
      });

      router.replace("/customer/onboarding/pending");
    } catch (error) {
      setErr(
        getSafeErrorMessage(
          error,
          "Unable to submit onboarding. Please try again."
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="text-sm text-[#4B5563]">Loading customer onboarding...</div>
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
              Customer onboarding
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#0A2E5C]">
            Set up your customer account
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
            Complete your company profile and submit it for admin review. Once
            approved, your customer workspace will be activated.
          </p>

          {err ? (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          {saveNote ? (
            <div className="mt-4 rounded-xl border border-[#D9E2EC] bg-[#F8FBFF] px-4 py-3 text-sm text-[#0A2E5C]">
              {saveNote}
            </div>
          ) : null}
        </section>

        <form onSubmit={handleSubmit} className="space-y-6">
          <SectionCard
            title="Company identity"
            description="These details are used for your customer profile and future agreement automation."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldLabel required>Marketplace company name</FieldLabel>
                <TextInput
                  value={marketplaceName}
                  onChange={(e) => setMarketplaceName(e.target.value)}
                  placeholder="e.g., Summit Wireless"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <FieldLabel required>Legal / company name</FieldLabel>
                <TextInput
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., Summit Wireless LLC"
                  required
                />
              </div>

              <div>
                <FieldLabel>Legal entity name</FieldLabel>
                <TextInput
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="e.g., Summit Wireless Holdings LLC"
                />
              </div>

              <div>
                <FieldLabel>DBA</FieldLabel>
                <TextInput
                  value={dbaName}
                  onChange={(e) => setDbaName(e.target.value)}
                  placeholder="e.g., Summit Telecom Ops"
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
                <FieldLabel>Company phone</FieldLabel>
                <TextInput
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 ..."
                />
              </div>

              <div className="sm:col-span-2">
                <FieldLabel>Company email</FieldLabel>
                <TextInput
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ops@company.com"
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
                <TextInput
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
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
                <TextInput
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                />
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
            title="Marketplace profile"
            description="This description can later be shown together with your company name in the marketplace."
          >
            <FieldLabel>Company description</FieldLabel>
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your company, work type, markets, and how contractors should understand your business."
            />
          </SectionCard>

          <SectionCard
            title="Project contact"
            description="This is the primary person responsible for telecom projects on the customer side."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Full name</FieldLabel>
                <TextInput
                  value={projectContactName}
                  onChange={(e) => setProjectContactName(e.target.value)}
                  placeholder="e.g., Mike Beaver"
                />
              </div>

              <div>
                <FieldLabel>Title / role</FieldLabel>
                <TextInput
                  value={projectContactTitle}
                  onChange={(e) => setProjectContactTitle(e.target.value)}
                  placeholder="e.g., Project Manager"
                />
              </div>

              <div>
                <FieldLabel>Email</FieldLabel>
                <TextInput
                  value={projectContactEmail}
                  onChange={(e) => setProjectContactEmail(e.target.value)}
                  placeholder="pm@company.com"
                />
              </div>

              <div>
                <FieldLabel>Phone</FieldLabel>
                <TextInput
                  value={projectContactPhone}
                  onChange={(e) => setProjectContactPhone(e.target.value)}
                  placeholder="+1 ..."
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Activation notification"
            description="Optional phone number for activation notice after admin approval."
          >
            <div className="grid grid-cols-1 gap-4">
              <div>
                <FieldLabel>Phone for activation notification</FieldLabel>
                <TextInput
                  value={activationNotificationPhone}
                  onChange={(e) => setActivationNotificationPhone(e.target.value)}
                  placeholder="+1 ..."
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="What happens next"
            description="After submission, your application moves to admin review."
          >
            <div className="space-y-3 text-sm leading-6 text-[#4B5563]">
              <p>1. We review your customer profile.</p>
              <p>2. After approval, your full workspace is activated.</p>
              <p>3. You will then be able to create jobs, review bids, and manage contractor relationships.</p>
            </div>
          </SectionCard>

          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-[#4B5563]">
                Current status:{" "}
                <span className="font-medium text-[#111827]">draft</span>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void saveDraft(true)}
                  disabled={
                    savingDraft ||
                    submitting ||
                    !marketplaceName.trim() ||
                    !companyName.trim()
                  }
                  className="rounded-xl border border-[#D9E2EC] bg-white px-5 py-3 text-sm font-semibold text-[#111827] shadow-sm transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingDraft ? "Saving..." : "Save draft"}
                </button>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !marketplaceName.trim() ||
                    !companyName.trim()
                  }
                  className="inline-flex items-center justify-center rounded-xl bg-[#1F6FB5] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0A2E5C] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Submit for review"}
                </button>
              </div>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}