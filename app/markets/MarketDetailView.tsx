import Link from "next/link";
import type { ReactNode } from "react";
import TrackPageView from "@/components/analytics/TrackPageView";
import { AnalyticsEvent } from "@/lib/analytics/events";
import { getMarketplaceHubSnapshot } from "@/lib/marketplace/publicData";

type MarketDetailViewProps = {
  stateSlug: string;
  marketSlug?: string;
};

export async function MarketDetailView({
  stateSlug,
  marketSlug,
}: MarketDetailViewProps) {
  const snapshot = await getMarketplaceHubSnapshot();
  const stateName = titleFromSlug(stateSlug);
  const localMarketName = marketSlug ? titleFromSlug(marketSlug) : null;
  const pageMarketName = localMarketName ?? stateName;
  const normalizedNeedle = normalize(pageMarketName);

  const matchingJobs = snapshot.openJobs.filter((job) =>
    normalize(job.market).includes(normalizedNeedle)
  );
  const matchingContractors = snapshot.contractors.filter((contractor) =>
    [contractor.homeMarket, ...contractor.markets]
      .map(normalize)
      .some((market) => market.includes(normalizedNeedle))
  );
  const commonScopes = Array.from(
    new Set(matchingJobs.map((job) => job.scope).filter(Boolean))
  ).slice(0, 6);

  return (
    <main className="min-h-screen bg-[#F4F8FC] text-[#111827]">
      <TrackPageView
        event={AnalyticsEvent.PUBLIC_MARKET_PAGE_VIEWED}
        meta={{ state: stateSlug, market: marketSlug ?? null }}
      />
      <header className="border-b border-[#D9E2EC] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10">
          <Link href="/markets" className="text-base font-semibold text-[#0A2E5C]">
            Telecom Markets
          </Link>
          <Link
            href="/signup?role=customer"
            className="rounded-lg bg-[#1F6FB5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#185f9c]"
          >
            Post a Job
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#1F6FB5]">
          Market detail
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight text-[#0A2E5C] md:text-5xl">
          Telecom marketplace activity in {pageMarketName}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-[#4B5563]">
          Review safe public signals for jobs, contractors, and common scopes in
          this market. Private customer contacts, contractor documents, and
          restricted operational details remain protected.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Metric label="Open jobs" value={String(matchingJobs.length)} />
          <Metric
            label="Active contractors"
            value={String(matchingContractors.length)}
          />
          <Metric label="Common scopes" value={String(commonScopes.length)} />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-14 md:grid-cols-[1fr_0.9fr] md:px-10">
        <Panel
          title={`Open jobs in ${pageMarketName}`}
          href="/marketplace/jobs"
          linkLabel="Browse all jobs"
        >
          {matchingJobs.length ? (
            matchingJobs.slice(0, 6).map((job) => (
              <Link
                key={job.id}
                href={`/marketplace/jobs/${job.id}`}
                className="block rounded-lg border border-[#D9E2EC] p-4 hover:border-[#1F6FB5] hover:bg-[#F8FBFF]"
              >
                <div className="text-sm font-semibold text-[#0A2E5C]">
                  {job.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-[#4B5563]">{job.scope}</p>
              </Link>
            ))
          ) : (
            <Empty text="No public-ready jobs are currently listed for this market." />
          )}
        </Panel>

        <div className="space-y-6">
          <Panel
            title={`Active contractors in ${pageMarketName}`}
            href="/marketplace/contractors"
            linkLabel="Browse contractors"
          >
            {matchingContractors.length ? (
              matchingContractors.slice(0, 6).map((contractor) => (
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
                </Link>
              ))
            ) : (
              <Empty text="No public contractor profiles are currently listed for this market." />
            )}
          </Panel>

          <Panel title="Common scopes" href="/signup?role=customer" linkLabel="Post demand">
            {commonScopes.length ? (
              commonScopes.map((scope) => (
                <div key={scope} className="rounded-lg bg-[#F4F8FC] p-3 text-sm text-[#0A2E5C]">
                  {scope}
                </div>
              ))
            ) : (
              <Empty text="Common scopes will appear as public jobs build market liquidity." />
            )}
          </Panel>
        </div>
      </section>
    </main>
  );
}

function Panel({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[#D9E2EC] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-[#0A2E5C]">{title}</h2>
        <Link
          href={href}
          className="rounded-lg border border-[#D9E2EC] px-3 py-2 text-xs font-semibold text-[#0A2E5C] hover:bg-[#F8FBFF]"
        >
          {linkLabel}
        </Link>
      </div>
      <div className="mt-5 space-y-3">{children}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#D9E2EC] bg-white p-5 shadow-sm">
      <div className="text-3xl font-semibold text-[#0A2E5C]">{value}</div>
      <div className="mt-2 text-sm font-medium text-[#4B5563]">{label}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#D9E2EC] bg-[#F8FBFF] p-5 text-sm leading-6 text-[#4B5563]">
      {text}
    </div>
  );
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function titleFromSlug(value: string) {
  return decodeURIComponent(value)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
