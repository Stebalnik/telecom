import Link from "next/link";

function WorkflowStep({
  label,
  description,
  href,
  status,
}: {
  label: string;
  description: string;
  href: string;
  status: "setup" | "review" | "active";
}) {
  const statusLabel =
    status === "active" ? "Active workflow" : status === "review" ? "Review point" : "Setup";
  const statusClasses =
    status === "active"
      ? "border-green-200 bg-green-50 text-green-700"
      : status === "review"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-[#D9E2EC] bg-[#F8FAFC] text-[#4B5563]";

  return (
    <Link
      href={href}
      className="grid gap-3 rounded-2xl border border-[#D9E2EC] bg-white p-4 shadow-sm transition hover:shadow-md sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
    >
      <div>
        <div className="text-sm font-semibold text-[#111827]">{label}</div>
        <p className="mt-1 text-sm leading-6 text-[#4B5563]">{description}</p>
      </div>
      <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses}`}>
        {statusLabel}
      </span>
    </Link>
  );
}

function ReadinessItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
      <div className="text-sm font-semibold text-[#111827]">{title}</div>
      <p className="mt-2 text-sm leading-6 text-[#4B5563]">{description}</p>
    </div>
  );
}

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

          <Link
            href="/contractor/hr/vacancies"
            className="mt-4 inline-block rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
          >
            Open vacancies
          </Link>
        </div>

        <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">Workers</h2>
          <p className="mt-2 text-sm leading-6 text-[#4B5563]">
            Search specialist profiles, review experience and certifications,
            and identify candidates for your teams.
          </p>

          <Link
            href="/contractor/hr/workers"
            className="mt-4 inline-block rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
          >
            Browse workers
          </Link>
        </div>

        <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">Invitations</h2>
          <p className="mt-2 text-sm leading-6 text-[#4B5563]">
            Track outbound invitations, monitor responses, and follow up with
            specialists you want to engage.
          </p>

          <Link
            href="/contractor/hr/invitations"
            className="mt-4 inline-block rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
          >
            View invitations
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0A2E5C]">
              Workforce pipeline
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#4B5563]">
              Use this sequence to move staffing needs from open role to invited specialist.
            </p>
          </div>
          <Link
            href="/contractor/hr/vacancies"
            className="w-fit rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
          >
            Start with vacancies
          </Link>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <WorkflowStep
            label="1. Define the staffing need"
            description="Create a vacancy with market, role, employment type, and pay range before sourcing specialists."
            href="/contractor/hr/vacancies"
            status="setup"
          />
          <WorkflowStep
            label="2. Compare available specialists"
            description="Review worker profiles for role fit, market coverage, certifications, and availability."
            href="/contractor/hr/workers"
            status="review"
          />
          <WorkflowStep
            label="3. Send targeted invitations"
            description="Invite the strongest specialists and track responses from one invitation queue."
            href="/contractor/hr/invitations"
            status="active"
          />
          <WorkflowStep
            label="4. Keep team records current"
            description="After a specialist accepts, update teams and member records for operational readiness."
            href="/contractor/teams"
            status="active"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#111827]">
          Workforce readiness checklist
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ReadinessItem
            title="Role clarity"
            description="Vacancies should name the required telecom role, market, and expected start timing."
          />
          <ReadinessItem
            title="Credential match"
            description="Review worker certifications before inviting specialists into customer-facing crews."
          />
          <ReadinessItem
            title="Availability fit"
            description="Use worker availability signals to reduce invitation churn and staffing delays."
          />
          <ReadinessItem
            title="Team assignment"
            description="Move accepted specialists into team records before assigning them to job execution."
          />
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
