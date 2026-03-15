"use client";

import Link from "next/link";

export default function ContractorSettingsPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827]">
              Settings
            </h1>
            <p className="mt-2 text-sm text-[#4B5563]">
              Manage portal preferences, notifications, and contractor workspace options.
            </p>
          </div>

          <Link
            href="/contractor"
            className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
          >
            Back to overview
          </Link>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">
            Notifications
          </h2>

          <div className="mt-4 space-y-4">
            <label className="flex items-start gap-3 rounded-xl border border-[#D9E2EC] p-4">
              <input type="checkbox" className="mt-1" defaultChecked />
              <div>
                <div className="text-sm font-medium text-[#111827]">
                  Document expiry reminders
                </div>
                <div className="text-sm text-[#4B5563]">
                  Receive reminders when insurance, COI, or certifications are close to expiration.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-[#D9E2EC] p-4">
              <input type="checkbox" className="mt-1" defaultChecked />
              <div>
                <div className="text-sm font-medium text-[#111827]">
                  Customer application updates
                </div>
                <div className="text-sm text-[#4B5563]">
                  Get notified when a customer approves or rejects your company.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-[#D9E2EC] p-4">
              <input type="checkbox" className="mt-1" />
              <div>
                <div className="text-sm font-medium text-[#111827]">
                  Job alerts
                </div>
                <div className="text-sm text-[#4B5563]">
                  Receive alerts when new jobs matching your scope become available.
                </div>
              </div>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">
            Workspace preferences
          </h2>

          <div className="mt-4 grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#111827]">
                Notification email
              </label>
              <input
                className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
                placeholder="notifications@company.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#111827]">
                Timezone
              </label>
              <input
                className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
                placeholder="America/Chicago"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#111827]">
                Language
              </label>
              <input
                className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
                placeholder="English"
              />
            </div>

            <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
              Settings persistence can be connected next to a dedicated contractor preferences table.
            </div>

            <button
              type="button"
              className="rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
            >
              Save preferences
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}