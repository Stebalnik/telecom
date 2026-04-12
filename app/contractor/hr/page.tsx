export default function ContractorHrPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#0A2E5C]">HR Center</h1>
        <p className="mt-2 text-sm text-[#4B5563]">
          Manage workforce hiring activity, review specialist demand, and move
          between vacancies, worker discovery, and invitations.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">Vacancies</h2>
          <p className="mt-2 text-sm leading-6 text-[#4B5563]">
            Create and manage specialist-facing vacancies for the roles you need
            to staff.
          </p>

          <a
            href="/contractor/hr/vacancies"
            className="mt-4 inline-block rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
          >
            Open vacancies
          </a>
        </div>

        <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">Workers</h2>
          <p className="mt-2 text-sm leading-6 text-[#4B5563]">
            Search specialist profiles, review experience and certifications,
            and identify candidates for your teams.
          </p>

          <a
            href="/contractor/hr/workers"
            className="mt-4 inline-block rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
          >
            Browse workers
          </a>
        </div>

        <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">Invitations</h2>
          <p className="mt-2 text-sm leading-6 text-[#4B5563]">
            Track outbound invitations, monitor responses, and follow up with
            specialists you want to engage.
          </p>

          <a
            href="/contractor/hr/invitations"
            className="mt-4 inline-block rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
          >
            View invitations
          </a>
        </div>
      </section>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#111827]">What happens here</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
            <div className="text-sm font-semibold text-[#111827]">
              1. Post vacancies
            </div>
            <p className="mt-2 text-sm leading-6 text-[#4B5563]">
              Define the role, market, employment type, pay range, and staffing
              need for each opening.
            </p>
          </div>

          <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
            <div className="text-sm font-semibold text-[#111827]">
              2. Review specialists
            </div>
            <p className="mt-2 text-sm leading-6 text-[#4B5563]">
              Filter candidates by structured profile data such as role, market,
              availability, and certifications.
            </p>
          </div>

          <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
            <div className="text-sm font-semibold text-[#111827]">
              3. Invite and hire
            </div>
            <p className="mt-2 text-sm leading-6 text-[#4B5563]">
              Send invitations to selected specialists and manage responses in a
              dedicated workflow.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}