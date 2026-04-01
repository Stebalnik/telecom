"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getMyCustomerDashboardStats,
  type CustomerDashboardStats,
} from "../../lib/customerDashboard";

function QuickCard({
  title,
  description,
  primaryAction,
  secondaryAction,
}: {
  title: string;
  description: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
}) {
  return (
    <section className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#0A2E5C]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#4B5563]">{description}</p>

      {(primaryAction || secondaryAction) && (
        <div className="mt-4 grid gap-2">
          {primaryAction ? (
            <Link
              href={primaryAction.href}
              className="block rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
            >
              {primaryAction.label}
            </Link>
          ) : null}

          {secondaryAction ? (
            <Link
              href={secondaryAction.href}
              className="block rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-center text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              {secondaryAction.label}
            </Link>
          ) : null}
        </div>
      )}
    </section>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold text-[#0A2E5C]">{value}</div>
      <div className="mt-1 text-sm text-[#4B5563]">{hint}</div>
    </div>
  );
}

function AttentionItem({
  title,
  description,
  href,
  tone = "default",
}: {
  title: string;
  description: string;
  href: string;
  tone?: "default" | "warning" | "danger";
}) {
  const toneClasses =
    tone === "danger"
      ? "border-red-200 bg-red-50"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : "border-[#D9E2EC] bg-white";

  return (
    <Link
      href={href}
      className={`block rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${toneClasses}`}
    >
      <div className="text-sm font-semibold text-[#111827]">{title}</div>
      <div className="mt-1 text-sm text-[#4B5563]">{description}</div>
    </Link>
  );
}

const emptyStats: CustomerDashboardStats = {
  customerId: "",
  customerName: "",
  openJobs: 0,
  jobsCloseToDeadline: 0,
  jobsWithNoBids: 0,
  bidsAwaitingReview: 0,
  totalBids: 0,
  approvedContractors: 0,
  pendingContractorApprovals: 0,
  attentionItems: 0,
};

export default function CustomerPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [stats, setStats] = useState<CustomerDashboardStats>(emptyStats);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setErr(null);

      try {
        const next = await getMyCustomerDashboardStats();
        if (!active) return;
        setStats(next);
      } catch (e: any) {
        if (!active) return;
        setErr(e?.message || "Failed to load dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight text-[#0A2E5C]">
            Customer Dashboard
          </h1>
          <p className="mt-2 text-sm text-[#4B5563]">Loading customer dashboard...</p>
        </section>
      </main>
    );
  }

  if (err) {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-red-700">Dashboard error</h1>
          <p className="mt-2 text-sm text-red-700">{err}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#0A2E5C]">
              Customer Dashboard
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
              {stats.customerName
                ? `Manage jobs, bids, contractors, and customer workflow for ${stats.customerName}.`
                : "Manage jobs, bids, contractors, and customer workflow from one workspace."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/customer/jobs/new"
              className="rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
            >
              Create Job
            </Link>
            <Link
              href="/customer/bids"
              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              Review Bids
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open Jobs"
          value={stats.openJobs}
          hint={`${stats.jobsWithNoBids} open jobs have no bids yet`}
        />
        <StatCard
          label="Bids Awaiting Review"
          value={stats.bidsAwaitingReview}
          hint={`${stats.totalBids} bids total across your jobs`}
        />
        <StatCard
          label="Approved Contractors"
          value={stats.approvedContractors}
          hint={`${stats.pendingContractorApprovals} contractor requests pending`}
        />
        <StatCard
          label="Attention Items"
          value={stats.attentionItems}
          hint="Items that need customer review or action"
        />
      </section>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[#0A2E5C]">Needs Attention</h2>
            <p className="mt-1 text-sm text-[#4B5563]">
              Operational items that may require immediate action.
            </p>
          </div>

          <Link
            href="/customer/requests"
            className="text-sm font-medium text-[#1F6FB5] transition hover:text-[#0A2E5C]"
          >
            Open requests
          </Link>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AttentionItem
            title={`${stats.bidsAwaitingReview} bids awaiting review`}
            description="New contractor offers are waiting for a customer decision."
            href="/customer/bids"
            tone={stats.bidsAwaitingReview > 0 ? "warning" : "default"}
          />
          <AttentionItem
            title={`${stats.pendingContractorApprovals} contractor approvals pending`}
            description="Contractors requested access to work with your organization."
            href="/customer/contractors"
            tone={stats.pendingContractorApprovals > 0 ? "warning" : "default"}
          />
          <AttentionItem
            title={`${stats.jobsCloseToDeadline} jobs close to deadline`}
            description="Open jobs with deadlines in the next 7 days."
            href="/customer/jobs/active"
            tone={stats.jobsCloseToDeadline > 0 ? "warning" : "default"}
          />
          <AttentionItem
            title={`${stats.jobsWithNoBids} open jobs with no bids`}
            description="These jobs may need visibility or contractor outreach."
            href="/customer/jobs/active"
            tone={stats.jobsWithNoBids > 0 ? "danger" : "default"}
          />
          <AttentionItem
            title="Compliance review"
            description="Open compliance settings and contractor qualification controls."
            href="/customer/compliance"
            tone="default"
          />
          <AttentionItem
            title="Agreements and requests"
            description="Review agreement status and incoming workflow requests."
            href="/customer/agreements"
            tone="default"
          />
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-[#0A2E5C]">Quick Actions</h2>
          <p className="mt-1 text-sm text-[#4B5563]">
            Jump directly into the main customer workflows.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <QuickCard
            title="Jobs"
            description="Create jobs, review active work, and keep completed work in archive."
            primaryAction={{ label: "Open jobs", href: "/customer/jobs" }}
            secondaryAction={{ label: "Create job", href: "/customer/jobs/new" }}
          />

          <QuickCard
            title="Bids"
            description="Review incoming bids, compare contractor offers, and make award decisions."
            primaryAction={{ label: "Open bids", href: "/customer/bids" }}
          />

          <QuickCard
            title="Contractors"
            description="Manage approved vendors, pending approvals, and contractor access."
            primaryAction={{ label: "Open contractors", href: "/customer/contractors" }}
            secondaryAction={{
              label: "Approved contractors",
              href: "/customer/contractors/approved",
            }}
          />

          <QuickCard
            title="Compliance"
            description="Control insurance requirements and contractor qualification rules."
            primaryAction={{ label: "Open compliance", href: "/customer/compliance" }}
          />

          <QuickCard
            title="Agreements"
            description="Review agreement status and contractor readiness."
            primaryAction={{ label: "Open agreements", href: "/customer/agreements" }}
          />

          <QuickCard
            title="Requests"
            description="Open contractor and workflow requests that need customer response."
            primaryAction={{ label: "Open requests", href: "/customer/requests" }}
          />

          <QuickCard
            title="Settings"
            description="Manage insurance requirements and certificate-per-scope settings."
            primaryAction={{ label: "Open settings", href: "/customer/settings" }}
            secondaryAction={{
              label: "Insurance settings",
              href: "/customer/settings/insurance",
            }}
          />
        </div>
      </section>
    </main>
  );
}