"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function TabLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={
        "text-sm px-3 py-2 rounded border " +
        (active ? "bg-black text-white" : "bg-white hover:bg-gray-50")
      }
    >
      {label}
    </Link>
  );
}

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Jobs</h1>
          <div className="text-sm text-gray-600">
            Create jobs, manage active jobs, and move completed/inactive jobs to archive.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link className="rounded border px-3 py-2 text-sm hover:bg-gray-50" href="/customer">
            Back
          </Link>
          <Link className="rounded bg-black px-4 py-2 text-white text-sm" href="/customer/jobs/new">
            + New Job
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <TabLink href="/customer/jobs/active" label="Active" />
        <TabLink href="/customer/jobs/archive" label="Archive" />
      </div>

      {children}
    </main>
  );
}