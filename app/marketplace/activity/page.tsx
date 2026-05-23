import Link from "next/link";
import { getSafeMarketplaceActivityFeed } from "@/lib/marketplace/publicData";

export const dynamic = "force-dynamic";

export default async function MarketplaceActivityPage() {
  const feed = await getSafeMarketplaceActivityFeed();

  return (
    <main className="min-h-screen bg-[#F4F8FC] text-[#111827]">
      <header className="border-b border-[#D9E2EC] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10">
          <Link href="/marketplace" className="text-base font-semibold text-[#0A2E5C]">
            LEOTEOR Marketplace
          </Link>
          <Link
            href="/signup?role=contractor"
            className="rounded-lg bg-[#1F6FB5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#185f9c]"
          >
            Join activity
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#1F6FB5]">
          Safe Activity Feed
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight text-[#0A2E5C] md:text-5xl">
          Marketplace movement without private data exposure.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-[#4B5563]">
          This feed shows public-safe events only: jobs posted, contractors
          listed, and market signals. It never shows customer contacts, emails,
          phone numbers, private documents, internal notes, or restricted job
          details.
        </p>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-14 md:grid-cols-[1fr_320px] md:px-10">
        <div className="rounded-lg border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#0A2E5C]">
            Recent safe activity
          </h2>
          <div className="mt-6 space-y-3">
            {feed.activity.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="block rounded-lg border border-[#D9E2EC] p-4 hover:border-[#1F6FB5] hover:bg-[#F8FBFF]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-[#0A2E5C]">
                    {item.label}
                  </span>
                  <span className="text-xs font-medium text-[#4B5563]">
                    {item.occurredAt ? formatDate(item.occurredAt) : "Public signal"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#4B5563]">
                  {item.description}
                </p>
              </Link>
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-lg border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0A2E5C]">What is hidden</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[#4B5563]">
              <p>Customer private contact details.</p>
              <p>Contractor compliance documents.</p>
              <p>Internal notes, files, and restricted workflow state.</p>
            </div>
          </div>

          <div className="rounded-lg border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0A2E5C]">
              Marketplace counters
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {feed.counters.map((counter) => (
                <div key={counter.label} className="rounded-lg bg-[#F4F8FC] p-3">
                  <div className="text-lg font-semibold text-[#0A2E5C]">
                    {counter.value}
                  </div>
                  <div className="text-xs text-[#4B5563]">{counter.label}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
