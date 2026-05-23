import Link from "next/link";
import { getPublicContractorsDirectorySnapshot } from "@/lib/marketplace/publicData";

export const dynamic = "force-dynamic";

export default async function PublicContractorsPage() {
  const snapshot = await getPublicContractorsDirectorySnapshot();

  return (
    <main className="min-h-screen bg-[#F4F8FC] text-[#111827]">
      <header className="border-b border-[#D9E2EC] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10">
          <Link href="/marketplace" className="text-base font-semibold text-[#0A2E5C]">
            LEOTEOR Marketplace
          </Link>
          <Link
            href="/signup?role=customer"
            className="rounded-lg bg-[#1F6FB5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#185f9c]"
          >
            Invite to job
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <div className="grid gap-8 md:grid-cols-[1fr_320px] md:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#1F6FB5]">
              Public Contractor Directory
            </p>
            <h1 className="mt-4 text-4xl font-semibold text-[#0A2E5C] md:text-5xl">
              Find telecom contractors by market, capability, and trust signals.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-[#4B5563]">
              Public profiles show only safe marketplace information. LEOTEOR
              keeps contacts, private documents, policy details, and approval
              records inside protected workflows.
            </p>
          </div>

          <div className="rounded-lg border border-[#D9E2EC] bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-[#0A2E5C]">
              Directory snapshot
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {snapshot.counters.map((counter) => (
                <div key={counter.label} className="rounded-lg bg-[#F4F8FC] p-3">
                  <div className="text-lg font-semibold text-[#0A2E5C]">
                    {counter.value}
                  </div>
                  <div className="text-xs text-[#4B5563]">{counter.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14 md:px-10">
        {snapshot.contractors.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {snapshot.contractors.map((contractor) => (
              <article
                key={contractor.id}
                className="flex min-h-[360px] flex-col rounded-lg border border-[#D9E2EC] bg-white p-5 shadow-sm"
              >
                <div>
                  <h2 className="text-lg font-semibold leading-6 text-[#0A2E5C]">
                    {contractor.name}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#4B5563]">
                    {contractor.headline}
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  <InfoRow label="Home market" value={contractor.homeMarket} />
                  <InfoRow
                    label="Markets served"
                    value={
                      contractor.markets.length
                        ? contractor.markets.join(", ")
                        : "Markets available during approval"
                    }
                  />
                  <InfoRow
                    label="Services"
                    value={contractor.services.join(", ")}
                  />
                  <InfoRow label="Team" value={contractor.teamSize} />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {contractor.trustBadges.slice(0, 4).map((badge) => (
                    <Badge
                      key={badge.label}
                      active={badge.status !== "pending"}
                      label={badge.label}
                    />
                  ))}
                </div>

                <div className="mt-auto pt-6">
                  <p className="mb-4 text-xs font-medium text-[#4B5563]">
                    {contractor.responseSignal}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href={`/marketplace/contractors/${contractor.id}`}
                      className="rounded-lg border border-[#D9E2EC] px-4 py-2 text-center text-sm font-semibold text-[#0A2E5C] hover:bg-[#F8FBFF]"
                    >
                      View profile
                    </Link>
                    <Link
                      href="/signup?role=customer"
                      className="rounded-lg bg-[#1F6FB5] px-4 py-2 text-center text-sm font-semibold text-white hover:bg-[#185f9c]"
                    >
                      Invite
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[#D9E2EC] bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-[#0A2E5C]">
              No public contractor profiles yet
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#4B5563]">
              Contractors will appear here after they publish safe marketplace
              profiles. Customers can still create jobs and invite contractors
              through protected approval workflows.
            </p>
            <Link
              href="/signup?role=contractor"
              className="mt-6 inline-flex rounded-lg bg-[#1F6FB5] px-5 py-3 text-sm font-semibold text-white hover:bg-[#185f9c]"
            >
              Join as Contractor
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#4B5563]">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium leading-6 text-[#0A2E5C]">
        {value}
      </div>
    </div>
  );
}

function Badge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
        active
          ? "border-[#B8E6C8] bg-[#F0FFF5] text-[#166534]"
          : "border-[#D9E2EC] bg-[#F8FBFF] text-[#4B5563]"
      }`}
    >
      {label}
    </span>
  );
}
