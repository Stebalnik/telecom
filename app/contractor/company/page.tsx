"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { getMyProfile } from "../../../lib/profile";
import { getMyCompany, type Company } from "../../../lib/contractor";

function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "success" | "warning" | "danger" | "neutral";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass}`}
    >
      {label}
    </span>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#0A2E5C]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-xl border border-[#D9E2EC] bg-[#F9FBFD] p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-[#111827]">
        {value && String(value).trim() ? value : "—"}
      </div>
    </div>
  );
}

function toneForCompanyStatus(status?: string | null) {
  const normalized = (status || "").toLowerCase();

  if (normalized === "active" || normalized === "approved") return "success";
  if (normalized === "pending" || normalized === "review") return "warning";
  if (normalized === "blocked" || normalized === "rejected") return "danger";
  return "neutral";
}

function toneForOnboarding(status?: string | null) {
  const normalized = (status || "").toLowerCase();

  if (normalized === "submitted" || normalized === "completed") return "success";
  if (normalized === "draft" || normalized === "pending") return "warning";
  if (normalized === "rejected") return "danger";
  return "neutral";
}

export default function ContractorCompanyPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    async function load() {
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
      } catch (e: any) {
        setErr(e?.message || "Failed to load company details.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  const addressLine = useMemo(() => {
    if (!company) return "—";

    const c = company as any;

    const cityStateZip = [c.city, c.state, c.zip].filter(Boolean).join(", ");

    return (
      [c.address_line1, c.address_line2, cityStateZip, c.country]
        .filter(Boolean)
        .join(" | ") || "—"
    );
  }, [company]);

  const maskedAccount = useMemo(() => {
    if (!company) return "—";

    const account = (company as any).bank_account;
    if (!account) return "—";

    const raw = String(account);
    return raw.length <= 4 ? raw : `••••${raw.slice(-4)}`;
  }, [company]);

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
                Company
              </h1>
              <p className="mt-1 text-sm text-[#4B5563]">
                Loading company details...
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
          <div className="min-w-0">
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
              Company
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
              Review your legal company details, contact information, address,
              and payout data. Company information is locked after onboarding
              submission and changes must be requested through settings.
            </p>

            {company ? (
              <div className="mt-5">
                <div className="text-xs uppercase tracking-wide text-[#4B5563]">
                  Registered company
                </div>
                <div className="mt-1 text-lg font-semibold text-[#111827]">
                  {company.legal_name || "—"}
                  {company.dba_name ? ` · ${company.dba_name}` : ""}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/contractor/company/change-request"
              className="inline-flex items-center justify-center rounded-xl bg-[#2EA3FF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
            >
              Request company data change
            </Link>

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

      {company ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
                Company status
              </div>
              <div className="mt-3">
                <StatusBadge
                  label={company.status || "Unknown"}
                  tone={toneForCompanyStatus(company.status)}
                />
              </div>
              {company.status === "blocked" && company.block_reason ? (
                <div className="mt-3 text-sm text-[#4B5563]">
                  {company.block_reason}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
                Onboarding
              </div>
              <div className="mt-3">
                <StatusBadge
                  label={String((company as any).onboarding_status || "—")}
                  tone={toneForOnboarding((company as any).onboarding_status)}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
                FEIN / Tax ID
              </div>
              <div className="mt-2 text-base font-semibold text-[#111827]">
                {(company as any).fein || "—"}
              </div>
            </div>

            <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
                Country
              </div>
              <div className="mt-2 text-base font-semibold text-[#111827]">
                {(company as any).country || "—"}
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <InfoCard title="Company information">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Legal name" value={company.legal_name} />
                <Field label="DBA name" value={company.dba_name} />
                <Field label="FEIN / Tax ID" value={(company as any).fein} />
                <Field label="Country" value={(company as any).country} />
              </div>
            </InfoCard>

            <InfoCard title="Contact details">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email" value={(company as any).email} />
                <Field label="Phone" value={(company as any).phone} />
              </div>
            </InfoCard>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <InfoCard title="Registered address">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Address line 1"
                  value={(company as any).address_line1}
                />
                <Field
                  label="Address line 2"
                  value={(company as any).address_line2}
                />
                <Field label="City" value={(company as any).city} />
                <Field label="State" value={(company as any).state} />
                <Field label="ZIP / Postal code" value={(company as any).zip} />
                <Field label="Country" value={(company as any).country} />
              </div>

              <div className="mt-4 rounded-xl border border-[#D9E2EC] bg-[#F9FBFD] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
                  Full address
                </div>
                <div className="mt-1 text-sm font-medium text-[#111827]">
                  {addressLine}
                </div>
              </div>
            </InfoCard>

            <InfoCard title="Payout details">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Account holder"
                  value={(company as any).bank_account_holder}
                />
                <Field
                  label="Routing number"
                  value={(company as any).bank_routing}
                />
                <Field label="Account number" value={maskedAccount} />
              </div>

              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-[#0A2E5C]">
                For security, only the last digits of the bank account are shown
                here.
              </div>
            </InfoCard>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <InfoCard title="Important notes">
              <div className="space-y-3 text-sm leading-6 text-[#4B5563]">
                <p>
                  Company data is read-only after onboarding submission.
                </p>
                <p>
                  If legal details, tax data, address, or payout information
                  must be changed, submit a company change request from the
                  settings page.
                </p>
                <p>
                  Keeping this information accurate is important for contractor
                  verification, insurance review, customer approvals, and job
                  eligibility.
                </p>
              </div>
            </InfoCard>

            <InfoCard title="Quick actions">
              <div className="space-y-3">
                <Link
                  href="/contractor/settings/company"
                  className="block rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm font-medium text-[#0A2E5C] transition hover:bg-[#F4F8FC]"
                >
                  Request company data change
                </Link>

                <Link
                  href="/contractor/insurance"
                  className="block rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm font-medium text-[#0A2E5C] transition hover:bg-[#F4F8FC]"
                >
                  Review insurance
                </Link>

                <Link
                  href="/contractor/coi"
                  className="block rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm font-medium text-[#0A2E5C] transition hover:bg-[#F4F8FC]"
                >
                  Open COI section
                </Link>
              </div>
            </InfoCard>
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 text-sm text-[#4B5563] shadow-sm">
          No company data found.
        </section>
      )}
    </main>
  );
}