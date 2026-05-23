import Link from "next/link";
import TrackPageView from "@/components/analytics/TrackPageView";
import { AnalyticsEvent } from "@/lib/analytics/events";
import { getPublicJobsDirectorySnapshot } from "@/lib/marketplace/publicData";

export const dynamic = "force-dynamic";

export default async function PublicJobsPage() {
  const snapshot = await getPublicJobsDirectorySnapshot();

  return (
    <main className="min-h-screen bg-[#F4F8FC] text-[#111827]">
      <TrackPageView event={AnalyticsEvent.PUBLIC_JOBS_VIEWED} />
      <header className="border-b border-[#D9E2EC] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10">
          <Link href="/marketplace" className="text-base font-semibold text-[#0A2E5C]">
            LEOTEOR Marketplace
          </Link>
          <Link
            href="/signup?role=contractor"
            className="rounded-lg bg-[#1F6FB5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#185f9c]"
          >
            Sign up to bid
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <div className="grid gap-8 md:grid-cols-[1fr_320px] md:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#1F6FB5]">
              Public Jobs Directory
            </p>
            <h1 className="mt-4 text-4xl font-semibold text-[#0A2E5C] md:text-5xl">
              Open telecom work that is safe to review before login.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-[#4B5563]">
              These listings show public-ready operational demand only. Customer
              contacts, private files, internal notes, and restricted details are
              protected inside authenticated LEOTEOR workflows.
            </p>
          </div>

          <div className="rounded-lg border border-[#D9E2EC] bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-[#0A2E5C]">
              Marketplace snapshot
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
        {snapshot.jobs.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {snapshot.jobs.map((job) => (
              <article
                key={job.id}
                className="flex min-h-[320px] flex-col rounded-lg border border-[#D9E2EC] bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold leading-6 text-[#0A2E5C]">
                      {job.title}
                    </h2>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#1F6FB5]">
                      {job.market}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#E8F3FF] px-3 py-1 text-xs font-semibold text-[#0A2E5C]">
                    {job.status}
                  </span>
                </div>

                <div className="mt-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#4B5563]">
                    Scope
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#4B5563]">{job.scope}</p>
                </div>

                <div className="mt-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#4B5563]">
                    Required certifications
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {job.requiredCertifications?.length ? (
                      job.requiredCertifications.slice(0, 4).map((cert) => (
                        <span
                          key={cert}
                          className="rounded-full border border-[#D9E2EC] px-3 py-1 text-xs font-medium text-[#0A2E5C]"
                        >
                          {cert}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-[#4B5563]">
                        Certification requirements available during review.
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {job.trustSignals?.slice(0, 3).map((signal) => (
                    <span
                      key={signal.label}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        signal.status === "pending"
                          ? "border-[#D9E2EC] bg-[#F8FBFF] text-[#4B5563]"
                          : "border-[#B8E6C8] bg-[#F0FFF5] text-[#166534]"
                      }`}
                    >
                      {signal.label}
                    </span>
                  ))}
                </div>

                <div className="mt-auto pt-6">
                  <div className="mb-4 flex items-center justify-between text-xs text-[#4B5563]">
                    <span>Posted {formatDate(job.createdAt)}</span>
                    <span>
                      {job.bidCount && job.bidCount > 0
                        ? `${job.bidCount} bids`
                        : "Contractors can apply"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href={`/marketplace/jobs/${job.id}`}
                      className="rounded-lg border border-[#D9E2EC] px-4 py-2 text-center text-sm font-semibold text-[#0A2E5C] hover:bg-[#F8FBFF]"
                    >
                      View job
                    </Link>
                    <Link
                      href="/signup?role=contractor"
                      className="rounded-lg bg-[#1F6FB5] px-4 py-2 text-center text-sm font-semibold text-white hover:bg-[#185f9c]"
                    >
                      Sign up to bid
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[#D9E2EC] bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-[#0A2E5C]">
              No public-ready jobs yet
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#4B5563]">
              Jobs will appear here once customers publish demand that passes
              public readiness checks. Contractors can still join now and build
              a verified profile for matching.
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
