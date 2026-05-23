import Link from "next/link";
import { notFound } from "next/navigation";
import TrackPageView from "@/components/analytics/TrackPageView";
import { AnalyticsEvent } from "@/lib/analytics/events";
import { getPublicContractorDetail } from "@/lib/marketplace/publicData";

export const dynamic = "force-dynamic";

export default async function PublicContractorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contractor = await getPublicContractorDetail(id);

  if (!contractor) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#F4F8FC] text-[#111827]">
      <TrackPageView
        event={AnalyticsEvent.PUBLIC_CONTRACTORS_VIEWED}
        meta={{ contractorCompanyId: contractor.id, surface: "detail" }}
      />
      <header className="border-b border-[#D9E2EC] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10">
          <Link
            href="/marketplace/contractors"
            className="text-base font-semibold text-[#0A2E5C]"
          >
            Public Contractors
          </Link>
          <Link
            href="/signup?role=customer"
            className="rounded-lg bg-[#1F6FB5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#185f9c]"
          >
            Request approval
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-[1fr_360px] md:px-10">
        <article className="rounded-lg border border-[#D9E2EC] bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#1F6FB5]">
            Contractor profile
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-[#0A2E5C] md:text-5xl">
            {contractor.name}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-[#4B5563]">
            {contractor.headline}
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <ProfileTile label="Home market" value={contractor.homeMarket} />
            <ProfileTile label="Team readiness" value={contractor.teamSize} />
            <ProfileTile
              label="Response signal"
              value={contractor.responseSignal}
            />
            <ProfileTile
              label="Services"
              value={contractor.services.join(", ")}
            />
          </div>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-[#0A2E5C]">
              Markets served
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {contractor.markets.length ? (
                contractor.markets.map((market) => (
                  <span
                    key={market}
                    className="rounded-full border border-[#D9E2EC] bg-[#F8FBFF] px-3 py-1 text-sm font-medium text-[#0A2E5C]"
                  >
                    {market}
                  </span>
                ))
              ) : (
                <p className="text-sm leading-6 text-[#4B5563]">
                  Markets are reviewed during customer approval.
                </p>
              )}
            </div>
          </section>
        </article>

        <aside className="space-y-6">
          <div className="rounded-lg border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0A2E5C]">
              Profile strength
            </h2>
            <div className="mt-4">
              <div className="flex items-end justify-between gap-4">
                <div className="text-4xl font-semibold text-[#0A2E5C]">
                  {contractor.profileStrength.score}%
                </div>
                <div className="rounded-full bg-[#EAF4FF] px-3 py-1 text-xs font-semibold text-[#1F6FB5]">
                  {contractor.profileStrength.label}
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-[#E5EEF7]">
                <div
                  className="h-2 rounded-full bg-[#2EA3FF]"
                  style={{ width: `${contractor.profileStrength.score}%` }}
                />
              </div>
              {contractor.profileStrength.missing.length ? (
                <p className="mt-3 text-sm leading-6 text-[#4B5563]">
                  Next public readiness items:{" "}
                  {contractor.profileStrength.missing.join(", ")}.
                </p>
              ) : (
                <p className="mt-3 text-sm leading-6 text-[#4B5563]">
                  Core public profile, market, service, compliance, and team
                  signals are present.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0A2E5C]">
              Trust badges
            </h2>
            <div className="mt-4 space-y-3">
              {contractor.trustBadges.map((badge) => (
                <div
                  key={badge.label}
                  className="rounded-lg border border-[#D9E2EC] bg-[#F4F8FC] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[#0A2E5C]">
                      {badge.label}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                        badge.status === "verified"
                          ? "bg-[#EAF8F0] text-[#166534]"
                          : badge.status === "active"
                          ? "bg-[#EAF4FF] text-[#1F6FB5]"
                          : "bg-white text-[#4B5563]"
                      }`}
                    >
                      {badge.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#4B5563]">
                    {badge.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0A2E5C]">
              Invite workflow
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#4B5563]">
              Customers can invite this contractor to a job or request approval
              after signing in. LEOTEOR keeps contact exchange and private
              compliance review inside protected workflows.
            </p>
            <Link
              href="/signup?role=customer"
              className="mt-5 inline-flex w-full justify-center rounded-lg bg-[#1F6FB5] px-5 py-3 text-sm font-semibold text-white hover:bg-[#185f9c]"
            >
              Invite to job
            </Link>
          </div>

          <div className="rounded-lg border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0A2E5C]">
              Compliance protection
            </h2>
            <div className="mt-4 space-y-3">
              {contractor.complianceSummary.map((item) => (
                <p key={item} className="text-sm leading-6 text-[#4B5563]">
                  {item}
                </p>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function ProfileTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#D9E2EC] bg-[#F8FBFF] p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#4B5563]">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold leading-6 text-[#0A2E5C]">
        {value}
      </div>
    </div>
  );
}
