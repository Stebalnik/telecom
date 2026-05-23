import Link from "next/link";
import type { ReactNode } from "react";
import TrackPageView from "@/components/analytics/TrackPageView";
import { AnalyticsEvent } from "@/lib/analytics/events";
import { getMarketplaceHubSnapshot } from "@/lib/marketplace/publicData";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const snapshot = await getMarketplaceHubSnapshot();

  return (
    <main className="min-h-screen bg-[#F4F8FC] text-[#111827]">
      <TrackPageView event={AnalyticsEvent.MARKETPLACE_HUB_VIEWED} />
      <header className="border-b border-[#D9E2EC] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10">
          <Link href="/" className="text-base font-semibold text-[#0A2E5C]">
            LEOTEOR
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/marketplace/jobs"
              className="rounded-lg border border-[#D9E2EC] px-4 py-2 text-sm font-medium text-[#0A2E5C] hover:bg-[#F8FBFF]"
            >
              Jobs
            </Link>
            <Link
              href="/signup?role=customer"
              className="rounded-lg bg-[#1F6FB5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#185f9c]"
            >
              Post a Job
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#1F6FB5]">
            Public Marketplace
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-[#0A2E5C] md:text-5xl">
            Telecom demand and qualified execution signals in one public view.
          </h1>
          <p className="mt-5 text-base leading-7 text-[#4B5563]">
            Browse public-ready opportunities, contractor capability, and market
            activity while private contacts, files, and internal notes stay
            protected behind authenticated workflows.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {snapshot.counters.map((counter) => (
            <div
              key={counter.label}
              className="rounded-lg border border-[#D9E2EC] bg-white p-5 shadow-sm"
            >
              <div className="text-2xl font-semibold text-[#0A2E5C]">
                {counter.value}
              </div>
              <div className="mt-1 text-sm font-semibold">{counter.label}</div>
              <div className="mt-1 text-xs leading-5 text-[#4B5563]">
                {counter.detail}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-12 md:grid-cols-[1.2fr_0.8fr] md:px-10">
        <div className="rounded-lg border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[#0A2E5C]">
                Open jobs preview
              </h2>
              <p className="mt-2 text-sm text-[#4B5563]">
                Public-ready work only. Sensitive customer information is not shown.
              </p>
            </div>
            <Link
              href="/marketplace/jobs"
              className="rounded-lg border border-[#D9E2EC] px-4 py-2 text-sm font-semibold text-[#0A2E5C] hover:bg-[#F8FBFF]"
            >
              View all
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {snapshot.openJobs.length ? (
              snapshot.openJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/marketplace/jobs/${job.id}`}
                  className="rounded-lg border border-[#D9E2EC] p-4 hover:border-[#1F6FB5] hover:bg-[#F8FBFF]"
                >
                  <div className="text-sm font-semibold text-[#0A2E5C]">
                    {job.title}
                  </div>
                  <div className="mt-2 text-xs font-medium uppercase tracking-[0.08em] text-[#1F6FB5]">
                    {job.market}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#4B5563]">
                    {job.scope}
                  </p>
                  <div className="mt-4 text-xs font-semibold text-[#111827]">
                    Status: {job.status}
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState text="Public-ready jobs will appear here as customers publish marketplace demand." />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <PreviewPanel title="Active contractors preview">
            {snapshot.contractors.length ? (
              snapshot.contractors.map((contractor) => (
                <Link
                  key={contractor.id}
                  href={`/marketplace/contractors/${contractor.id}`}
                  className="block rounded-lg border border-[#D9E2EC] p-4 hover:border-[#1F6FB5] hover:bg-[#F8FBFF]"
                >
                  <div className="text-sm font-semibold text-[#0A2E5C]">
                    {contractor.name}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#4B5563]">
                    {contractor.headline}
                  </p>
                  <div className="mt-3 text-xs font-medium text-[#1F6FB5]">
                    Home market: {contractor.homeMarket}
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState text="Listed contractor profiles will appear after contractors publish safe marketplace profiles." />
            )}
          </PreviewPanel>

          <PreviewPanel title="Markets preview">
            {snapshot.markets.length ? (
              snapshot.markets.map((market) => (
                <Link
                  key={market.name}
                  href={`/markets/${encodeURIComponent(market.name.toLowerCase().replaceAll(" ", "-"))}`}
                  className="block rounded-lg border border-[#D9E2EC] p-4 hover:border-[#1F6FB5] hover:bg-[#F8FBFF]"
                >
                  <div className="text-sm font-semibold text-[#0A2E5C]">
                    {market.name}
                  </div>
                  <div className="mt-2 text-xs text-[#4B5563]">
                    {market.openJobs} open jobs - {market.activeContractors} active contractors
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState text="Markets will appear as public jobs and listed contractors build liquidity." />
            )}
          </PreviewPanel>
        </div>
      </section>

      <section className="border-y border-[#D9E2EC] bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-12 md:grid-cols-3 md:px-10">
          {snapshot.recentActivity.map((activity) => (
            <div key={activity} className="rounded-lg border border-[#D9E2EC] p-5">
              <div className="text-sm font-semibold text-[#0A2E5C]">
                Safe activity
              </div>
              <p className="mt-3 text-sm leading-6 text-[#4B5563]">{activity}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-12 md:grid-cols-2 md:px-10">
        <CtaBlock
          title="Customers"
          text="Publish telecom work, surface contractor fit, and manage approvals from one workflow."
          href="/signup?role=customer"
          label="Post a Job"
        />
        <CtaBlock
          title="Contractors"
          text="Join the marketplace, show verified capability, and find jobs by market and scope."
          href="/signup?role=contractor"
          label="Join as Contractor"
        />
      </section>
    </main>
  );
}

function PreviewPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[#D9E2EC] bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-[#0A2E5C]">{title}</h2>
      <div className="mt-5 space-y-3">{children}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#D9E2EC] bg-[#F8FBFF] p-5 text-sm leading-6 text-[#4B5563]">
      {text}
    </div>
  );
}

function CtaBlock({
  title,
  text,
  href,
  label,
}: {
  title: string;
  text: string;
  href: string;
  label: string;
}) {
  return (
    <div className="rounded-lg border border-[#D9E2EC] bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-[#0A2E5C]">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[#4B5563]">{text}</p>
      <Link
        href={href}
        className="mt-5 inline-flex rounded-lg bg-[#1F6FB5] px-5 py-3 text-sm font-semibold text-white hover:bg-[#185f9c]"
      >
        {label}
      </Link>
    </div>
  );
}
