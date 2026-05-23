import Link from "next/link";
import { getMarketplaceLandingSnapshot } from "@/lib/marketplace/publicData";

export const dynamic = "force-dynamic";

const customerSignals = [
  "Post public-ready telecom demand without exposing private contacts.",
  "Compare bids, compliance status, approvals, and contractor readiness.",
  "Move operational work from intake to award with a visible trust layer.",
];

const contractorSignals = [
  "Discover open telecom jobs before committing to a full onboarding flow.",
  "Understand market, scope, certification, and insurance expectations.",
  "Build a verified profile that helps customers trust your team.",
];

const complianceSignals = [
  "Insurance and certification readiness",
  "Role-based customer and contractor access",
  "Protected private files and internal notes",
  "Qualification signals before job award",
];

export default async function HomePage() {
  const marketplace = await getMarketplaceLandingSnapshot();

  return (
    <main className="min-h-screen bg-[#F4F8FC] text-[#111827]">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 md:px-10">
        <div className="text-base md:text-lg font-semibold text-[#0A2E5C]">
          LEOTEOR
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/marketplace"
            className="hidden rounded-lg border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] shadow-sm hover:bg-[#F8FBFF] sm:inline-flex"
          >
            Marketplace
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] shadow-sm hover:bg-[#F8FBFF]"
          >
            Login
          </Link>

          <Link
            href="/signup?role=contractor"
            className="rounded-lg bg-[#1F6FB5] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#185f9c]"
          >
            Join
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-6 pb-12 pt-6 md:grid-cols-[1.05fr_0.95fr] md:px-10 md:pb-16 md:pt-10">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#1F6FB5]">
            Operational Trust Infrastructure
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight text-[#0A2E5C] md:text-6xl">
            Telecom contractors. Jobs. Compliance. One platform.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#4B5563] md:text-lg">
            LEOTEOR makes telecom demand discoverable, contractor capability
            visible, and compliance review operational before private details
            ever enter the workflow.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup?role=customer"
              className="inline-flex items-center justify-center rounded-lg bg-[#1F6FB5] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#185f9c]"
            >
              Post a Job
            </Link>
            <Link
              href="/signup?role=contractor"
              className="inline-flex items-center justify-center rounded-lg border border-[#D9E2EC] bg-white px-6 py-3 text-sm font-semibold text-[#0A2E5C] shadow-sm hover:bg-[#F8FBFF]"
            >
              Join as Contractor
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {marketplace.counters.map((counter) => (
              <div
                key={counter.label}
                className="rounded-lg border border-[#D9E2EC] bg-white p-4 shadow-sm"
              >
                <div className="text-2xl font-semibold text-[#0A2E5C]">
                  {counter.value}
                </div>
                <div className="mt-1 text-sm font-medium text-[#111827]">
                  {counter.label}
                </div>
                <div className="mt-1 text-xs leading-5 text-[#4B5563]">
                  {counter.detail}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[#D9E2EC] bg-white p-5 shadow-sm md:p-6">
          <div className="rounded-lg bg-[#F4F8FC] p-5">
            <div className="flex items-center justify-between gap-4 border-b border-[#D9E2EC] pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1F6FB5]">
                  Marketplace activity
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[#0A2E5C]">
                  Live operating signals
                </h2>
              </div>
              <div className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#0A2E5C] shadow-sm">
                Public-safe
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {marketplace.recentActivity.map((activity) => (
                <div
                  key={activity}
                  className="rounded-lg border border-[#D9E2EC] bg-white p-4 text-sm leading-6 text-[#4B5563]"
                >
                  {activity}
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href="/marketplace/jobs"
                className="rounded-lg bg-[#0A2E5C] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#08264d]"
              >
                Browse Jobs
              </Link>
              <Link
                href="/marketplace/contractors"
                className="rounded-lg border border-[#D9E2EC] bg-white px-4 py-3 text-center text-sm font-semibold text-[#0A2E5C] hover:bg-[#F8FBFF]"
              >
                Find Contractors
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#D9E2EC] bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-12 md:grid-cols-4 md:px-10">
          {[
            ["1", "Customers publish public-ready operational demand."],
            ["2", "Contractors discover jobs by market, scope, and fit."],
            ["3", "Compliance and qualification gaps become visible."],
            ["4", "Teams move toward approval, bid, and award workflows."],
          ].map(([step, text]) => (
            <div key={step} className="rounded-lg border border-[#D9E2EC] p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8F3FF] text-sm font-semibold text-[#1F6FB5]">
                {step}
              </div>
              <p className="mt-4 text-sm leading-6 text-[#4B5563]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-12 md:grid-cols-3 md:px-10">
        <InfoPanel title="For customers" items={customerSignals} />
        <InfoPanel title="For contractors" items={contractorSignals} />
        <InfoPanel title="Compliance" items={complianceSignals} />
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pb-14 md:px-10">
        <div className="rounded-lg bg-[#0A2E5C] px-6 py-8 text-white md:px-10">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-2xl font-semibold">
                Build marketplace liquidity with trust built in.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#DCEBFA]">
                Public visibility brings the right customers and contractors
                into LEOTEOR while private workflow data remains protected by
                authenticated dashboards and role-based access.
              </p>
            </div>
            <Link
              href="/marketplace"
              className="inline-flex justify-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#0A2E5C] hover:bg-[#F4F8FC]"
            >
              Open Marketplace
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#D9E2EC] px-6 py-6">
        <div className="flex flex-col items-center justify-center gap-2 text-center text-sm text-[#4B5563]">
          <div>© 2023-2026 LEOTEOR LLC. All rights reserved.</div>
          <div className="flex items-center gap-5">
            <Link href="/terms" className="hover:text-[#0A2E5C]">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-[#0A2E5C]">
              Privacy
            </Link>
            <Link href="/mission" className="hover:text-[#0A2E5C]">
              Mission
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function InfoPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-[#D9E2EC] bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[#0A2E5C]">{title}</h2>
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex gap-3">
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#2EA3FF]" />
            <p className="text-sm leading-6 text-[#4B5563]">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
