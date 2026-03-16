"use client";

import Link from "next/link";

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
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-[#0A2E5C]">{value}</div>
      <div className="mt-1 text-sm text-[#4B5563]">{hint}</div>
    </div>
  );
}

export default function CustomerPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-[#0A2E5C]">
          Customer Dashboard
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
          Create jobs, review bids, manage contractors, control compliance, and
          keep project workflows organized from one customer workspace.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Jobs"
          value="Manage"
          hint="Open, active, and archived work"
        />
        <StatCard
          label="Bids"
          value="Review"
          hint="Track submitted contractor offers"
        />
        <StatCard
          label="Contractors"
          value="Approve"
          hint="Manage vendor access and COI visibility"
        />
        <StatCard
          label="Compliance"
          value="Control"
          hint="Insurance and certification requirements"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <QuickCard
          title="Jobs"
          description="Create new jobs, view active jobs, and keep older work in archive."
          primaryAction={{ label: "Open jobs", href: "/customer/jobs" }}
          secondaryAction={{ label: "Create job", href: "/customer/jobs/new" }}
        />

        <QuickCard
          title="Contractors"
          description="Browse marketplace contractors, approved vendors, and available compliance information."
          primaryAction={{
            label: "Open contractors",
            href: "/customer/contractors",
          }}
          secondaryAction={{
            label: "Approved contractors",
            href: "/customer/contractors/approved",
          }}
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
      </section>
    </main>
  );
}