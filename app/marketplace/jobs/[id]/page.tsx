import Link from "next/link";
import { notFound } from "next/navigation";
import TrackPageView from "@/components/analytics/TrackPageView";
import { AnalyticsEvent } from "@/lib/analytics/events";
import { getPublicJobDetail } from "@/lib/marketplace/publicData";

export const dynamic = "force-dynamic";

export default async function PublicJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getPublicJobDetail(id);

  if (!job) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#F4F8FC] text-[#111827]">
      <TrackPageView
        event={AnalyticsEvent.PUBLIC_JOBS_VIEWED}
        meta={{ jobId: job.id, surface: "detail" }}
      />
      <header className="border-b border-[#D9E2EC] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10">
          <Link href="/marketplace/jobs" className="text-base font-semibold text-[#0A2E5C]">
            Public Jobs
          </Link>
          <Link
            href="/signup?role=contractor"
            className="rounded-lg bg-[#1F6FB5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#185f9c]"
          >
            Sign up to bid
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-[1fr_360px] md:px-10">
        <article className="rounded-lg border border-[#D9E2EC] bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#E8F3FF] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#0A2E5C]">
              {job.status}
            </span>
            <span className="text-sm font-medium text-[#4B5563]">
              Posted {formatDate(job.createdAt)}
            </span>
          </div>

          <h1 className="mt-5 text-4xl font-semibold leading-tight text-[#0A2E5C] md:text-5xl">
            {job.title}
          </h1>
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#1F6FB5]">
            {job.market}
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <SummaryTile label="Scope" value={job.scope} />
            <SummaryTile
              label="Bid activity"
              value={
                job.bidCount && job.bidCount > 0
                  ? `${job.bidCount} bids submitted`
                  : "Contractors can apply"
              }
            />
          </div>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-[#0A2E5C]">
              Public description
            </h2>
            <p className="mt-3 whitespace-pre-line text-base leading-7 text-[#4B5563]">
              {job.description}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-[#0A2E5C]">
              Required certifications
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {job.requiredCertifications?.length ? (
                job.requiredCertifications.map((cert) => (
                  <span
                    key={cert}
                    className="rounded-full border border-[#D9E2EC] bg-[#F8FBFF] px-3 py-1 text-sm font-medium text-[#0A2E5C]"
                  >
                    {cert}
                  </span>
                ))
              ) : (
                <p className="text-sm leading-6 text-[#4B5563]">
                  Certification requirements will be confirmed during contractor
                  eligibility review.
                </p>
              )}
            </div>
          </section>
        </article>

        <aside className="space-y-6">
          <div className="rounded-lg border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0A2E5C]">
              Contractor next step
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#4B5563]">
              Create a contractor profile to review protected workflow details,
              complete compliance, and submit a bid when eligible.
            </p>
            <Link
              href="/signup?role=contractor"
              className="mt-5 inline-flex w-full justify-center rounded-lg bg-[#1F6FB5] px-5 py-3 text-sm font-semibold text-white hover:bg-[#185f9c]"
            >
              Sign up to bid
            </Link>
          </div>

          <div className="rounded-lg border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0A2E5C]">
              Trust signals
            </h2>
            <div className="mt-4 space-y-3">
              {job.trustSignals.map((signal) => (
                <div
                  key={signal.label}
                  className="rounded-lg border border-[#D9E2EC] bg-[#F4F8FC] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[#0A2E5C]">
                      {signal.label}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                        signal.status === "pending"
                          ? "bg-white text-[#4B5563]"
                          : "bg-[#EAF8F0] text-[#166534]"
                      }`}
                    >
                      {signal.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#4B5563]">
                    {signal.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0A2E5C]">
              Protected by design
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#4B5563]">
              LEOTEOR does not show customer emails, phone numbers, private
              files, internal notes, or restricted job details on public pages.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
