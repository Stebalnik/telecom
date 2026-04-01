"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getMyProfile } from "../../../lib/profile";
import { createMyCustomerOrg, getMyCustomerOrg, CustomerOrg } from "../../../lib/customers";

export default function CustomerSettingsHomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [org, setOrg] = useState<CustomerOrg | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgDesc, setOrgDesc] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const profile = await getMyProfile();
      if (!profile) {
        router.replace("/login");
        return;
      }

      if (profile.role !== "customer") {
        router.replace("/dashboard");
        return;
      }

      const o = await getMyCustomerOrg();
      setOrg(o ?? null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createOrg() {
    setErr(null);
    setCreating(true);

    try {
      if (!orgName.trim()) throw new Error("Customer name is required.");

      await createMyCustomerOrg({
  name: orgName.trim(),
  description: orgDesc.trim() || "",
});
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Create org error");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading customer settings...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#0A2E5C]">
              Customer Settings
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
              Manage your customer organization profile, insurance rules, and
              certificate requirements for contractor qualification.
            </p>
          </div>

          <Link
            href="/customer"
            className="inline-flex items-center justify-center rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
          >
            Back to Dashboard
          </Link>
        </div>
      </section>

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      {!org ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#0A2E5C]">
            Create Your Customer Organization
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#4B5563]">
            Each customer account needs one organization before jobs, bids, and
            contractor requirements can be managed.
          </p>

          <div className="mt-5 grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#111827]">
                Customer name
              </label>
              <input
                className="w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5]"
                placeholder="Customer name (e.g. MasTec)"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={creating}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#111827]">
                Description
              </label>
              <textarea
                className="min-h-[110px] w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5]"
                placeholder="Description (optional)"
                value={orgDesc}
                onChange={(e) => setOrgDesc(e.target.value)}
                disabled={creating}
              />
            </div>

            <div className="flex justify-end">
              <button
                className={`rounded-xl px-5 py-2.5 text-sm font-medium text-white transition ${
                  creating
                    ? "bg-[#9CA3AF]"
                    : "bg-[#1F6FB5] hover:bg-[#0A2E5C]"
                }`}
                onClick={createOrg}
                disabled={creating}
              >
                {creating ? "Creating..." : "Create Organization"}
              </button>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
              Organization
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {org.name}
            </div>
            {org.description ? (
              <p className="mt-2 text-sm leading-6 text-[#4B5563]">
                {org.description}
              </p>
            ) : null}
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <Link
              href="/customer/settings/insurance"
              className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm transition hover:bg-[#F8FAFC]"
            >
              <div className="text-lg font-semibold text-[#0A2E5C]">
                Insurance Requirements
              </div>
              <div className="mt-2 text-sm leading-6 text-[#4B5563]">
                Insurance limits, endorsements, expiration rules, carrier rules,
                and bond settings.
              </div>
            </Link>

            <Link
              href="/customer/settings/certs-per-scope"
              className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm transition hover:bg-[#F8FAFC]"
            >
              <div className="text-lg font-semibold text-[#0A2E5C]">
                Certs per Scope Requirements
              </div>
              <div className="mt-2 text-sm leading-6 text-[#4B5563]">
                Minimum certificate requirements in team for each work scope.
              </div>
            </Link>
          </section>
        </>
      )}
    </main>
  );
}