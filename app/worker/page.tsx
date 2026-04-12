export default function WorkerDashboardPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#0A2E5C]">
          Specialist Dashboard
        </h1>
        <p className="mt-2 text-sm text-[#4B5563]">
          Manage your profile, certifications, availability, and respond to
          opportunities from contractors.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">
            Your Profile
          </h2>
          <p className="mt-2 text-sm text-[#4B5563]">
            Complete your profile to increase your chances of being selected by
            contractors.
          </p>

          <a
            href="/worker/profile"
            className="mt-4 inline-block rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
          >
            Edit profile
          </a>
        </div>

        <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">
            Availability
          </h2>
          <p className="mt-2 text-sm text-[#4B5563]">
            Set your availability and preferred markets so contractors can find
            and invite you.
          </p>

          <a
            href="/worker/availability"
            className="mt-4 inline-block rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
          >
            Update availability
          </a>
        </div>

        <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">
            Vacancies
          </h2>
          <p className="mt-2 text-sm text-[#4B5563]">
            Browse open positions posted by contractors and apply to relevant
            opportunities.
          </p>

          <a
            href="/worker/vacancies"
            className="mt-4 inline-block rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
          >
            View vacancies
          </a>
        </div>

        <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">
            Invitations
          </h2>
          <p className="mt-2 text-sm text-[#4B5563]">
            Review and respond to invitations from contractors to join teams or
            specific roles.
          </p>

          <a
            href="/worker/invitations"
            className="mt-4 inline-block rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
          >
            View invitations
          </a>
        </div>
      </section>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#111827]">
          Applications
        </h2>
        <p className="mt-2 text-sm text-[#4B5563]">
          Track the status of your submitted applications and follow up on
          opportunities.
        </p>

        <a
          href="/worker/applications"
          className="mt-4 inline-block rounded-xl bg-[#2EA3FF] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1F6FB5]"
        >
          View applications
        </a>
      </section>
    </main>
  );
}