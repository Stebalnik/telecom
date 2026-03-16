"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function TabLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = isActive(pathname, href);

  return (
    <Link
      href={href}
      className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-[#1F6FB5] text-white"
          : "border border-[#D9E2EC] bg-white text-[#111827] hover:bg-[#F8FAFC]"
      }`}
    >
      {label}
    </Link>
  );
}

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#0A2E5C]">
              Jobs
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
              Create jobs, manage active jobs, and move completed or inactive jobs
              to archive.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              className="rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
              href="/customer/jobs/new"
            >
              + New Job
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <TabLink href="/customer/jobs/active" label="Active" />
          <TabLink href="/customer/jobs/archive" label="Archive" />
        </div>
      </section>

      {children}
    </main>
  );
}