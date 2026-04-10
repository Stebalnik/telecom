"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { withErrorLogging } from "../../lib/errors/withErrorLogging";
import { getMyProfile } from "../../lib/profile";
import {
  getMyCompany,
  listMembers,
  listTeams,
  type Company,
  type Team,
} from "../../lib/contractor";
import {
  listCompanyInsurance,
  listMemberCerts,
  type DocumentRow,
} from "../../lib/documents";
import { supabase } from "../../lib/supabaseClient";

type OverviewStats = {
  insuranceTotal: number;
  approvedInsurance: number;
  pendingInsurance: number;
  rejectedInsurance: number;
  teamsTotal: number;
  membersTotal: number;
  certsTotal: number;
};

type ContractorOverviewProfile = {
  role?: string | null;
} | null;

function StatusBadge({
  status,
  blockReason,
}: {
  status?: string | null;
  blockReason?: string | null;
}) {
  const normalized = (status || "").toLowerCase();

  const styles =
    normalized === "active"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : normalized === "blocked"
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-blue-50 text-blue-700 border-blue-200";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${styles}`}
      >
        {status || "Unknown"}
      </span>

      {normalized === "blocked" && blockReason ? (
        <span className="text-sm text-[#4B5563]">{blockReason}</span>
      ) : null}
    </div>
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

function NavCard({
  href,
  title,
  desc,
  cta = "Open",
}: {
  href: string;
  title: string;
  desc: string;
  cta?: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm transition hover:-translate-y-[1px] hover:border-[#8FC8FF] hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-[#0A2E5C]">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-[#4B5563]">{desc}</p>
        </div>

        <span className="rounded-lg bg-[#EAF3FF] px-2.5 py-1 text-xs font-semibold text-[#1F6FB5]">
          {cta}
        </span>
      </div>
    </Link>
  );
}

export default function ContractorPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [company, setCompany] = useState<Company | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [stats, setStats] = useState<OverviewStats>({
    insuranceTotal: 0,
    approvedInsurance: 0,
    pendingInsurance: 0,
    rejectedInsurance: 0,
    teamsTotal: 0,
    membersTotal: 0,
    certsTotal: 0,
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
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
            message: "contractor_overview_session_load_failed",
            code: "contractor_overview_session_load_failed",
            source: "frontend",
            area: "contractor",
            role: "contractor",
            path: "/contractor",
          }
        );

        if (!mounted) return;

        if (!sessionResult.data.session?.user) {
          router.replace("/login");
          return;
        }

        const profile = (await withErrorLogging(
          async () => (await getMyProfile()) as ContractorOverviewProfile,
          {
            message: "contractor_overview_profile_load_failed",
            code: "contractor_overview_profile_load_failed",
            source: "frontend",
            area: "contractor",
            role: "contractor",
            path: "/contractor",
          }
        )) as ContractorOverviewProfile;

        if (!mounted) return;

        if (!profile || profile.role !== "contractor") {
          router.replace("/dashboard");
          return;
        }

        const currentCompany = await withErrorLogging(
          async () => await getMyCompany(),
          {
            message: "contractor_overview_company_load_failed",
            code: "contractor_overview_company_load_failed",
            source: "frontend",
            area: "contractor",
            role: "contractor",
            path: "/contractor",
          }
        );

        if (!mounted) return;

        if (!currentCompany) {
          router.replace("/contractor/onboarding");
          return;
        }

        setCompany(currentCompany);

        const [companyTeams, insuranceDocs] = await Promise.all([
          withErrorLogging(
            async () => await listTeams(currentCompany.id),
            {
              message: "contractor_overview_teams_load_failed",
              code: "contractor_overview_teams_load_failed",
              source: "frontend",
              area: "contractor",
              role: "contractor",
              path: "/contractor",
              details: {
                companyId: currentCompany.id,
              },
            }
          ),
          withErrorLogging(
            async () => await listCompanyInsurance(currentCompany.id),
            {
              message: "contractor_overview_insurance_load_failed",
              code: "contractor_overview_insurance_load_failed",
              source: "frontend",
              area: "contractor",
              role: "contractor",
              path: "/contractor",
              details: {
                companyId: currentCompany.id,
              },
            }
          ),
        ]);

        if (!mounted) return;

        setTeams(companyTeams);

        let membersTotal = 0;
        let certsTotal = 0;

        for (const team of companyTeams) {
          const members = await withErrorLogging(
            async () => await listMembers(team.id),
            {
              message: "contractor_overview_members_load_failed",
              code: "contractor_overview_members_load_failed",
              source: "frontend",
              area: "contractor",
              role: "contractor",
              path: "/contractor",
              details: {
                teamId: team.id,
              },
            }
          );

          membersTotal += members.length;

          for (const member of members) {
            const certs = await withErrorLogging(
              async () => await listMemberCerts(member.id),
              {
                message: "contractor_overview_member_certs_load_failed",
                code: "contractor_overview_member_certs_load_failed",
                source: "frontend",
                area: "contractor",
                role: "contractor",
                path: "/contractor",
                details: {
                  memberId: member.id,
                },
              }
            );

            certsTotal += certs.length;
          }
        }

        if (!mounted) return;

        setStats({
          insuranceTotal: insuranceDocs.length,
          approvedInsurance: insuranceDocs.filter(
            (doc: DocumentRow) => doc.verification_status === "approved"
          ).length,
          pendingInsurance: insuranceDocs.filter(
            (doc: DocumentRow) => doc.verification_status === "pending"
          ).length,
          rejectedInsurance: insuranceDocs.filter(
            (doc: DocumentRow) => doc.verification_status === "rejected"
          ).length,
          teamsTotal: companyTeams.length,
          membersTotal,
          certsTotal,
        });
      } catch {
        if (!mounted) return;
        setErr("Unable to load contractor overview. Please try again.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [router]);

  const onboardingLabel = useMemo(() => {
    if (!company) return "—";
    return company.onboarding_status || "—";
  }, [company]);

  const publicProfile = useMemo(() => company?.public_profile ?? null, [company]);

  if (loading) {
    return (
      <main className="space-y-6">
        <div className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
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
                Contractor Overview
              </h1>
              <p className="mt-1 text-sm text-[#4B5563]">
                Loading your company workspace...
              </p>
            </div>
          </div>
        </div>
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
              Contractor Overview
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
              Manage company information, insurance compliance, teams,
              certifications, customer approvals, and job activity from one
              place.
            </p>

            {company ? (
              <div className="mt-5 space-y-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-[#4B5563]">
                    Company
                  </div>
                  <div className="mt-1 text-lg font-semibold text-[#111827]">
                    {company.legal_name}
                    {company.dba_name ? ` · ${company.dba_name}` : ""}
                  </div>
                </div>

                <StatusBadge
                  status={company.status}
                  blockReason={company.block_reason}
                />
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/contractor/jobs"
              className="inline-flex items-center justify-center rounded-xl bg-[#2EA3FF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
            >
              Browse Jobs
            </Link>

            <Link
              href="/contractor/customers"
              className="inline-flex items-center justify-center rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-semibold text-[#0A2E5C] transition hover:bg-[#F4F8FC]"
            >
              Open Customers
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
        <StatCard
          label="Company status"
          value={company?.status || "—"}
          hint={`Onboarding: ${onboardingLabel}`}
        />
        <StatCard
          label="Insurance documents"
          value={stats.insuranceTotal}
          hint={`${stats.approvedInsurance} approved · ${stats.pendingInsurance} pending`}
        />
        <StatCard
          label="Teams and members"
          value={stats.teamsTotal}
          hint={`${stats.membersTotal} members total`}
        />
        <StatCard
          label="Certificates"
          value={stats.certsTotal}
          hint="Across all team members"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Insurance mode"
          value={company?.insurance_mode || "—"}
          hint="Company profile setting"
        />
        <StatCard
          label="Home market"
          value={publicProfile?.home_market || "—"}
          hint="Primary market"
        />
        <StatCard
          label="Markets"
          value={publicProfile?.markets?.length || 0}
          hint={
            publicProfile?.markets?.length
              ? publicProfile.markets.join(" · ")
              : "No markets set"
          }
        />
        <StatCard
          label="Payout method"
          value={company?.payout_method_type || "—"}
          hint={company?.payout_account_label || "No payout label set"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <NavCard
          href="/contractor/company"
          title="Company"
          desc="View legal details, address, payout information, and marketplace profile settings."
        />

        <NavCard
          href="/contractor/insurance"
          title="Insurance"
          desc="Upload and manage company insurance documents, expiration dates and approval statuses."
        />

        <NavCard
          href="/contractor/coi"
          title="COI"
          desc="Manage COI file, policies, endorsements and insured entities for customer-facing compliance."
        />

        <NavCard
          href="/contractor/teams"
          title="Teams"
          desc="Create crews, add team members and organize operational resources by team."
        />

        <NavCard
          href="/contractor/certifications"
          title="Certifications"
          desc="Upload and track member certifications required for telecom scopes and customer approval."
        />

        <NavCard
          href="/contractor/customers"
          title="Customers"
          desc="Track customer relationships, applications, approvals and vendor access."
        />

        <NavCard
          href="/contractor/jobs"
          title="Jobs"
          desc="Review available jobs, open job details and prepare bids using your approved teams."
        />

        <NavCard
          href="/contractor/settings/company"
          title="Settings"
          desc="Submit company data change requests and manage company-related account settings."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0A2E5C]">
            Compliance snapshot
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#D9E2EC] bg-[#F9FBFD] p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
                Approved insurance
              </div>
              <div className="mt-2 text-2xl font-semibold text-[#111827]">
                {stats.approvedInsurance}
              </div>
            </div>

            <div className="rounded-xl border border-[#D9E2EC] bg-[#F9FBFD] p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
                Pending review
              </div>
              <div className="mt-2 text-2xl font-semibold text-[#111827]">
                {stats.pendingInsurance}
              </div>
            </div>

            <div className="rounded-xl border border-[#D9E2EC] bg-[#F9FBFD] p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
                Rejected docs
              </div>
              <div className="mt-2 text-2xl font-semibold text-[#111827]">
                {stats.rejectedInsurance}
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-[#4B5563]">
            Use the Insurance and Certifications sections to keep the company
            eligible for customer approvals and job bidding.
          </div>
        </div>

        <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0A2E5C]">
            Recommended next actions
          </h2>

          <div className="mt-4 space-y-3">
            <Link
              href="/contractor/insurance"
              className="block rounded-xl border border-[#D9E2EC] px-4 py-3 text-sm font-medium text-[#0A2E5C] transition hover:bg-[#F4F8FC]"
            >
              Review insurance documents
            </Link>

            <Link
              href="/contractor/certifications"
              className="block rounded-xl border border-[#D9E2EC] px-4 py-3 text-sm font-medium text-[#0A2E5C] transition hover:bg-[#F4F8FC]"
            >
              Upload missing certifications
            </Link>

            <Link
              href="/contractor/teams"
              className="block rounded-xl border border-[#D9E2EC] px-4 py-3 text-sm font-medium text-[#0A2E5C] transition hover:bg-[#F4F8FC]"
            >
              Update teams and members
            </Link>

            <Link
              href="/contractor/settings/company"
              className="block rounded-xl border border-[#D9E2EC] px-4 py-3 text-sm font-medium text-[#0A2E5C] transition hover:bg-[#F4F8FC]"
            >
              Request company data change
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}