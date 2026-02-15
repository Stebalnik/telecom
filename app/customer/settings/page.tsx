"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile } from "../../../lib/profile";
import { listInsuranceTypes, InsuranceType, listCertTypes, CertType } from "../../../lib/documents";
import {
  createMyCustomerOrg,
  deleteCustomerScopeReq,
  getMyCustomerOrg,
  listCustomerInsuranceReq,
  listCustomerScopeReq,
  listScopes,
  upsertCustomerInsuranceReq,
  upsertCustomerScopeReq,
  CustomerOrg,
  Scope,
  CustomerInsuranceRequirement,
  CustomerScopeRequirement,
} from "../../../lib/customers";

function moneyToNumber(v: string) {
  const cleaned = v.replace(/[^0-9]/g, "");
  if (!cleaned) return null;
  return Number(cleaned);
}

export default function CustomerSettingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [org, setOrg] = useState<CustomerOrg | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgDesc, setOrgDesc] = useState("");

  const [insuranceTypes, setInsuranceTypes] = useState<InsuranceType[]>([]);
  const [certTypes, setCertTypes] = useState<CertType[]>([]);
  const [scopes, setScopes] = useState<Scope[]>([]);

  const [insReq, setInsReq] = useState<CustomerInsuranceRequirement[]>([]);
  const [scopeReq, setScopeReq] = useState<CustomerScopeRequirement[]>([]);

  const scopeNameById = useMemo(() => {
    const m: Record<string, string> = {};
    scopes.forEach((s) => (m[s.id] = s.name));
    return m;
  }, [scopes]);

  const certNameById = useMemo(() => {
    const m: Record<string, string> = {};
    certTypes.forEach((c) => (m[c.id] = c.name));
    return m;
  }, [certTypes]);

  async function load() {
    setLoading(true);
    setErr(null);

    const profile = await getMyProfile();
    if (!profile) return router.replace("/login");
    if (profile.role !== "customer") return router.replace("/dashboard");

    try {
      const [org0, it, ct, sc] = await Promise.all([
        getMyCustomerOrg(),
        listInsuranceTypes(),
        listCertTypes(),
        listScopes(),
      ]);

      setOrg(org0);
      setInsuranceTypes(it);
      setCertTypes(ct);
      setScopes(sc);

      if (org0) {
        const [ir, sr] = await Promise.all([
          listCustomerInsuranceReq(org0.id),
          listCustomerScopeReq(org0.id),
        ]);
        setInsReq(ir);
        setScopeReq(sr);
      }
    } catch (e: any) {
      setErr(e.message ?? "Load error");
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
    try {
      if (!orgName.trim()) return setErr("Customer name is required.");
      const o = await createMyCustomerOrg({ name: orgName.trim(), description: orgDesc.trim() });
      setOrg(o);
      await load();
    } catch (e: any) {
      setErr(e.message ?? "Create org error");
    }
  }

  function getInsReqRow(insuranceTypeId: string) {
    return insReq.find((r) => r.insurance_type_id === insuranceTypeId) || null;
  }

  async function saveInsReq(insuranceTypeId: string, patch: Partial<CustomerInsuranceRequirement>) {
    if (!org) return;
    setErr(null);

    const existing = getInsReqRow(insuranceTypeId);

    const row: any = {
      customer_id: org.id,
      insurance_type_id: insuranceTypeId,
      is_required: existing?.is_required ?? true,
      min_limit_each_occurrence: existing?.min_limit_each_occurrence ?? null,
      min_limit_aggregate: existing?.min_limit_aggregate ?? null,
      require_additional_insured: existing?.require_additional_insured ?? false,
      require_blanket_additional_insured: existing?.require_blanket_additional_insured ?? false,
      require_primary_noncontributory: existing?.require_primary_noncontributory ?? false,
      require_waiver_subrogation: existing?.require_waiver_subrogation ?? false,
      notes: existing?.notes ?? null,
      ...patch,
    };

    try {
      await upsertCustomerInsuranceReq(row);
      await load();
    } catch (e: any) {
      setErr(e.message ?? "Save insurance requirement error");
    }
  }

  async function addOrUpdateScopeReq(scopeId: string, certTypeId: string, minCount: number) {
    if (!org) return;
    setErr(null);
    try {
      await upsertCustomerScopeReq({
        customer_id: org.id,
        scope_id: scopeId,
        cert_type_id: certTypeId,
        min_count_in_team: minCount,
      });
      await load();
    } catch (e: any) {
      setErr(e.message ?? "Save scope requirement error");
    }
  }

  async function removeScopeReq(scopeId: string, certTypeId: string) {
    if (!org) return;
    setErr(null);
    try {
      await deleteCustomerScopeReq(org.id, scopeId, certTypeId);
      await load();
    } catch (e: any) {
      setErr(e.message ?? "Delete scope requirement error");
    }
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customer settings</h1>
        <a className="underline" href="/customer">Back</a>
      </div>

      {loading && <p>Loading...</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {!org && !loading && (
        <section className="rounded border p-4 space-y-3">
          <h2 className="font-semibold">Create your Customer org (one per account)</h2>
          <input className="w-full rounded border p-2" placeholder="Customer name (e.g., MasTec)" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          <textarea className="w-full rounded border p-2" placeholder="Description (optional)" value={orgDesc} onChange={(e) => setOrgDesc(e.target.value)} />
          <button className="rounded bg-black px-4 py-2 text-white" onClick={createOrg}>
            Create
          </button>
        </section>
      )}

      {org && (
        <>
          <section className="rounded border p-4">
            <div className="text-sm text-gray-600">Org</div>
            <div className="text-lg font-semibold">{org.name}</div>
            {org.description && <div className="text-sm text-gray-700">{org.description}</div>}
          </section>

          <section className="rounded border p-4 space-y-3">
            <h2 className="font-semibold">Company insurance requirements (vendor pre-qualification)</h2>
            <p className="text-sm text-gray-600">
              Contractors can see these requirements. Admin will approve/reject vendor applications.
            </p>

            <div className="space-y-3">
              {insuranceTypes.map((it) => {
                const row = getInsReqRow(it.id);
                return (
                  <div key={it.id} className="rounded border p-3">
                    <div className="flex items-center justify-between">
                      <b>{it.name}</b>
                      <label className="text-sm flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={row?.is_required ?? true}
                          onChange={(e) => saveInsReq(it.id, { is_required: e.target.checked })}
                        />
                        Required
                      </label>
                    </div>

                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <input
                        className="rounded border p-2"
                        placeholder="Min each occurrence (e.g. 1000000)"
                        defaultValue={row?.min_limit_each_occurrence ?? ""}
                        onBlur={(e) => saveInsReq(it.id, { min_limit_each_occurrence: moneyToNumber(e.target.value) })}
                      />
                      <input
                        className="rounded border p-2"
                        placeholder="Min aggregate (e.g. 2000000)"
                        defaultValue={row?.min_limit_aggregate ?? ""}
                        onBlur={(e) => saveInsReq(it.id, { min_limit_aggregate: moneyToNumber(e.target.value) })}
                      />
                    </div>

                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <label className="text-sm flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={row?.require_additional_insured ?? false}
                          onChange={(e) => saveInsReq(it.id, { require_additional_insured: e.target.checked })}
                        />
                        Additional Insured
                      </label>

                      <label className="text-sm flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={row?.require_blanket_additional_insured ?? false}
                          onChange={(e) => saveInsReq(it.id, { require_blanket_additional_insured: e.target.checked })}
                        />
                        Blanket Additional Insured
                      </label>

                      <label className="text-sm flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={row?.require_primary_noncontributory ?? false}
                          onChange={(e) => saveInsReq(it.id, { require_primary_noncontributory: e.target.checked })}
                        />
                        Primary &amp; Non-contributory
                      </label>

                      <label className="text-sm flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={row?.require_waiver_subrogation ?? false}
                          onChange={(e) => saveInsReq(it.id, { require_waiver_subrogation: e.target.checked })}
                        />
                        Waiver of subrogation
                      </label>
                    </div>

                    <textarea
                      className="mt-2 w-full rounded border p-2"
                      placeholder="Notes / exceptions"
                      defaultValue={row?.notes ?? ""}
                      onBlur={(e) => saveInsReq(it.id, { notes: e.target.value || null })}
                    />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded border p-4 space-y-3">
            <h2 className="font-semibold">Team requirements per scope</h2>
            <p className="text-sm text-gray-600">
              Example: scope=tower requires TTT-1 min 2 techs. Civil may not require TTT-1.
            </p>

            <div className="grid gap-3 md:grid-cols-3">
              {scopes.map((s) => {
                const items = scopeReq.filter((r) => r.scope_id === s.id);
                return (
                  <div key={s.id} className="rounded border p-3">
                    <b>{s.name}</b>
                    {s.description && <div className="text-sm text-gray-600">{s.description}</div>}

                    <div className="mt-2 space-y-2">
                      {items.map((r) => (
                        <div key={r.cert_type_id} className="flex items-center justify-between gap-2">
                          <div className="text-sm">
                            {certNameById[r.cert_type_id] || r.cert_type_id} — min <b>{r.min_count_in_team}</b>
                          </div>
                          <button className="rounded border px-2 py-1 text-xs" onClick={() => removeScopeReq(s.id, r.cert_type_id)}>
                            Remove
                          </button>
                        </div>
                      ))}
                      {items.length === 0 && <div className="text-sm text-gray-600">No requirements yet.</div>}
                    </div>

                    <div className="mt-3 rounded border p-2 space-y-2">
                      <div className="text-sm font-semibold">Add / update requirement</div>
                      <select
                        className="w-full rounded border p-2"
                        defaultValue=""
                        onChange={async (e) => {
                          const certId = e.target.value;
                          if (!certId) return;
                          const min = Number(prompt("Minimum count in team for this certificate?", "1") || "1");
                          if (!min || min < 1) return;
                          await addOrUpdateScopeReq(s.id, certId, min);
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
                      <div className="text-xs text-gray-600">
                        After selecting a cert, you will be asked for min count.
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded border p-4">
            <div className="mt-6 rounded border p-4 space-y-3">
  <h2 className="text-lg font-semibold">Next steps</h2>

  <a
    className="block rounded bg-black px-4 py-2 text-white"
    href="/customer/jobs"
  >
    Create Jobs (with scope)
  </a>

  <a
    className="block rounded bg-black px-4 py-2 text-white"
    href="/admin"
  >
    Admin approvals (next)
  </a>

  <a
    className="block rounded bg-black px-4 py-2 text-white"
    href="/customer/contractors"
  >
    Contractor apply to work with you (next)
  </a>
</div>

          </section>
        </>
      )}
    </main>
  );
}
