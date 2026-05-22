import Link from "next/link";

type StatusTone = "ready" | "review" | "action";

function StatusCard({
  title,
  value,
  detail,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  tone: StatusTone;
}) {
  const styles =
    tone === "ready"
      ? "border-green-200 bg-green-50 text-green-800"
      : tone === "action"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-blue-200 bg-blue-50 text-blue-800";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${styles}`}>
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-sm leading-6">{detail}</div>
    </div>
  );
}

function ChecklistItem({
  title,
  detail,
  href,
}: {
  title: string;
  detail: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm transition hover:bg-[#F8FAFC]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-[#111827]">{title}</div>
          <div className="mt-1 text-sm leading-6 text-[#4B5563]">{detail}</div>
        </div>
        <span className="shrink-0 rounded-xl border border-[#D9E2EC] bg-white px-3 py-2 text-sm font-medium text-[#0A2E5C]">
          Review
        </span>
      </div>
    </Link>
  );
}

export default function CustomerCompliancePage() {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#0A2E5C]">
              Compliance
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
              Track the customer-side compliance areas that affect contractor
              readiness, approval decisions, onboarding resources, and job
              execution.
            </p>
          </div>

          <Link
            href="/customer"
            className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#0A2E5C] transition hover:bg-[#F8FAFC]"
          >
            Back to customer
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatusCard
          title="Review cadence"
          value="Ongoing"
          detail="Use this hub before approving contractors or publishing new work."
          tone="review"
        />
        <StatusCard
          title="Contractor readiness"
          value="Visible"
          detail="Approved contractors, requests, and required documents remain linked."
          tone="ready"
        />
        <StatusCard
          title="Action areas"
          value="4"
          detail="Insurance, certifications, resources, and approvals need regular review."
          tone="action"
        />
      </section>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#111827]">
          Compliance review checklist
        </h2>
        <p className="mt-1 text-sm leading-6 text-[#4B5563]">
          Follow these links to inspect the live operational records that make
          up customer compliance status.
        </p>

        <div className="mt-5 grid gap-3">
          <ChecklistItem
            title="Insurance requirements"
            detail="Confirm coverage rules and certificate expectations before approving contractors."
            href="/customer/settings/insurance"
          />
          <ChecklistItem
            title="Certification requirements"
            detail="Review certificate requirements by scope so job eligibility stays clear."
            href="/customer/settings/certs-per-scope"
          />
          <ChecklistItem
            title="Contractor approvals"
            detail="Check pending approval requests and returned items that may need follow-up."
            href="/customer/requests"
          />
          <ChecklistItem
            title="Approved contractor roster"
            detail="Review active contractors and discovery filters for readiness signals."
            href="/customer/contractors/approved"
          />
          <ChecklistItem
            title="Contractor resources"
            detail="Verify required SOPs, safety files, and market-scoped resources are current."
            href="/customer/resources"
          />
        </div>
      </section>
    </main>
  );
}
