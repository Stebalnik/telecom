import Link from "next/link";

export default function LegalPage({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#0A2E5C]">
                {title}
              </h1>
              {effectiveDate ? (
                <p className="mt-2 text-sm text-[#4B5563]">
                  Effective date: {effectiveDate}
                </p>
              ) : null}
            </div>

            <p className="text-sm text-[#4B5563]">
  Please review this document and return 
  to the previous tab when finished.
</p>
          </div>

          <div className="prose prose-slate max-w-none prose-headings:text-[#0A2E5C] prose-p:text-[#111827] prose-li:text-[#111827]">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}