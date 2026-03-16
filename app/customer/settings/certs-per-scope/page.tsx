"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getMyProfile } from "../../../../lib/profile";
import {
  getMyCustomerOrg,
  listCustomerScopeReq,
  listScopes,
  upsertCustomerScopeReq,
  deleteCustomerScopeReq,
  CustomerOrg,
  Scope,
  CustomerScopeRequirement,
} from "../../../../lib/customers";
import { listCertTypes, CertType } from "../../../../lib/documents";

function scopeLabel(s: Scope) {
  return s.description && s.description.trim() ? s.description : s.name;
}

type PendingRequirement = {
  scopeId: string;
  scopeLabel: string;
  certTypeId: string;
  certName: string;
};

export default function CustomerCertsPerScopeSettingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [org, setOrg] = useState<CustomerOrg | null>(null);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [certTypes, setCertTypes] = useState<CertType[]>([]);
  const [scopeReq, setScopeReq] = useState<CustomerScopeRequirement[]>([]);

  const [pendingRequirement, setPendingRequirement] =
    useState<PendingRequirement | null>(null);
  const [pendingMinCount, setPendingMinCount] = useState("1");
  const [modalSaving, setModalSaving] = useState(false);

  const certNameById = useMemo(() => {
    const m: Record<string, string> = {};
    certTypes.forEach((c) => {
      m[c.id] = c.name;
    });
    return m;
  }, [certTypes]);

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
      if (!o) {
        router.replace("/customer/settings");
        return;
      }

      setOrg(o);

      const [sc, ct, req] = await Promise.all([
        listScopes(),
        listCertTypes(),
        listCustomerScopeReq(o.id),
      ]);

      setScopes(sc);
      setCertTypes(ct);
      setScopeReq(req);
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

  async function addOrUpdateScopeReq(
    scopeId: string,
    certTypeId: string,
    minCount: number
  ) {
    if (!org) return;

    setErr(null);

    try {
      await upsertCustomerScopeReq({
        customer_id: org.id,
        scope_id: scopeId,
        cert_type_id: certTypeId,
        min_count_in_team: minCount,
        notes: null,
      });

      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Upsert scope requirement error");
      throw e;
    }
  }

  async function removeScopeReq(scopeId: string, certTypeId: string) {
    if (!org) return;

    setErr(null);

    try {
      await deleteCustomerScopeReq(org.id, scopeId, certTypeId);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Delete scope requirement error");
    }
  }

  function openRequirementModal(scopeId: string, scopeLabelValue: string, certTypeId: string) {
    const certName = certNameById[certTypeId] || "Certificate";

    setPendingRequirement({
      scopeId,
      scopeLabel: scopeLabelValue,
      certTypeId,
      certName,
    });
    setPendingMinCount("1");
  }

  function closeRequirementModal() {
    if (modalSaving) return;
    setPendingRequirement(null);
    setPendingMinCount("1");
  }

  async function saveRequirementFromModal() {
    if (!pendingRequirement) return;

    const parsed = Number(pendingMinCount);

    if (!Number.isInteger(parsed) || parsed < 1) {
      setErr("Minimum count must be a whole number greater than 0.");
      return;
    }

    setModalSaving(true);
    setErr(null);

    try {
      await addOrUpdateScopeReq(
        pendingRequirement.scopeId,
        pendingRequirement.certTypeId,
        parsed
      );
      closeRequirementModal();
    } catch {
      // err already set in addOrUpdateScopeReq
    } finally {
      setModalSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading scope requirements...</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <main className="space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#0A2E5C]">
                Certs per Scope Requirements
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
                Configure minimum team certificate requirements for each scope.
                Example: Tower scope may require TTT-1 with a minimum number of
                certified techs, while civil scopes may require a different set.
              </p>
            </div>

            <Link
              href="/customer/settings"
              className="inline-flex items-center justify-center rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              Back to Settings
            </Link>
          </div>
        </section>

        {err ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {err}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {scopes.map((s) => {
            const items = scopeReq.filter((r) => r.scope_id === s.id);
            const label = scopeLabel(s);

            return (
              <section
                key={s.id}
                className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm"
              >
                <div>
                  <h2 className="text-lg font-semibold text-[#0A2E5C]">
                    {label}
                  </h2>

                  {s.description &&
                  s.name &&
                  s.description !== s.name ? (
                    <div className="mt-1 text-xs text-[#6B7280]">Code: {s.name}</div>
                  ) : null}
                </div>

                <div className="mt-4 space-y-3">
                  {items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#D9E2EC] bg-[#FBFDFF] p-4 text-sm text-[#4B5563]">
                      No requirements yet.
                    </div>
                  ) : (
                    items.map((r) => (
                      <div
                        key={r.cert_type_id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#D9E2EC] bg-[#FBFDFF] p-4"
                      >
                        <div className="min-w-0 text-sm text-[#111827]">
                          {certNameById[r.cert_type_id] || r.cert_type_id}
                          <div className="mt-1 text-xs text-[#6B7280]">
                            Minimum in team:{" "}
                            <span className="font-semibold text-[#111827]">
                              {r.min_count_in_team}
                            </span>
                          </div>
                        </div>

                        <button
                          className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                          onClick={() => removeScopeReq(s.id, r.cert_type_id)}
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-5 rounded-2xl border border-[#E5EDF5] bg-[#FBFDFF] p-4">
                  <div className="text-sm font-semibold text-[#0A2E5C]">
                    Add / Update Requirement
                  </div>

                  <select
                    className="mt-3 w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5]"
                    defaultValue=""
                    onChange={(e) => {
                      const certId = e.target.value;
                      if (!certId) return;

                      openRequirementModal(s.id, label, certId);
                      e.currentTarget.value = "";
                    }}
                  >
                    <option value="">Select certificate...</option>
                    {certTypes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-xs text-[#6B7280]">
                    Select a certificate and then set the minimum required count
                    in team.
                  </p>
                </div>
              </section>
            );
          })}
        </section>
      </main>

      {pendingRequirement ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-[#0A2E5C]">
              Set Minimum Count
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#4B5563]">
              Scope:{" "}
              <span className="font-medium text-[#111827]">
                {pendingRequirement.scopeLabel}
              </span>
              <br />
              Certificate:{" "}
              <span className="font-medium text-[#111827]">
                {pendingRequirement.certName}
              </span>
            </p>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-[#111827]">
                Minimum required in team
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={pendingMinCount}
                onChange={(e) => setPendingMinCount(e.target.value)}
                className="w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5]"
                autoFocus
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                onClick={closeRequirementModal}
                disabled={modalSaving}
              >
                Cancel
              </button>

              <button
                type="button"
                className={`rounded-xl px-4 py-2.5 text-sm font-medium text-white transition ${
                  modalSaving
                    ? "bg-[#9CA3AF]"
                    : "bg-[#1F6FB5] hover:bg-[#0A2E5C]"
                }`}
                onClick={saveRequirementFromModal}
                disabled={modalSaving}
              >
                {modalSaving ? "Saving..." : "Save Requirement"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}