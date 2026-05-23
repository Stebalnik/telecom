import Link from "next/link";
import TrackPageView from "@/components/analytics/TrackPageView";
import { AnalyticsEvent } from "@/lib/analytics/events";
import { getMarketplaceHubSnapshot } from "@/lib/marketplace/publicData";

export const dynamic = "force-dynamic";

export default async function PublicMarketsPage() {
  const snapshot = await getMarketplaceHubSnapshot();

  return (
    <main className="min-h-screen bg-[#F4F8FC] text-[#111827]">
      <TrackPageView event={AnalyticsEvent.PUBLIC_MARKET_PAGE_VIEWED} />
      <header className="border-b border-[#D9E2EC] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10">
          <Link href="/marketplace" className="text-base font-semibold text-[#0A2E5C]">
            LEOTEOR Marketplace
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
          Telecom Markets
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight text-[#0A2E5C] md:text-5xl">
          See where telecom demand and contractor capacity are forming.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-[#4B5563]">
          Market pages help customers understand contractor liquidity and help
          contractors discover public-ready jobs without exposing private job or
          compliance details.
        </p>

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

      <section className="mx-auto max-w-7xl px-6 pb-14 md:px-10">
        {snapshot.markets.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {snapshot.markets.map((market) => (
              <Link
                key={market.name}
                href={`/markets/${marketSlug(market.name)}`}
                className="rounded-lg border border-[#D9E2EC] bg-white p-6 shadow-sm hover:border-[#1F6FB5] hover:bg-[#F8FBFF]"
              >
                <h2 className="text-xl font-semibold text-[#0A2E5C]">
                  {market.name}
                </h2>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Metric label="Open jobs" value={String(market.openJobs)} />
                  <Metric
                    label="Contractors"
                    value={String(market.activeContractors)}
                  />
                </div>
                <p className="mt-5 text-sm leading-6 text-[#4B5563]">
                  Review public-ready demand, active contractor coverage, and
                  common telecom execution patterns for this market.
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[#D9E2EC] bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-[#0A2E5C]">
              Markets will appear as public activity grows
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#4B5563]">
              LEOTEOR will surface market pages when public-ready jobs and
              contractor profiles create safe marketplace signals.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/signup?role=customer"
                className="rounded-lg bg-[#1F6FB5] px-5 py-3 text-sm font-semibold text-white hover:bg-[#185f9c]"
              >
                Post a Job
              </Link>
              <Link
                href="/signup?role=contractor"
                className="rounded-lg border border-[#D9E2EC] bg-white px-5 py-3 text-sm font-semibold text-[#0A2E5C] hover:bg-[#F8FBFF]"
              >
                Join as Contractor
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#F4F8FC] p-4">
      <div className="text-2xl font-semibold text-[#0A2E5C]">{value}</div>
      <div className="mt-1 text-xs font-medium text-[#4B5563]">{label}</div>
    </div>
  );
}

function marketSlug(value: string) {
  return encodeURIComponent(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}
