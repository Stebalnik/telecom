"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { getMyProfile } from "../../../lib/profile";
import { getMyCompany } from "../../../lib/contractor";
import {
  createOrUpdateMyCOI,
  getMyCOI,
  listInsuranceTypes,
  listEndorsementTypes,
  listCOIPolicies,
  upsertCOIPolicy,
  deleteCOIPolicy,
  listCOIEndorsements,
  saveCOIEndorsements,
  COIRow,
  InsuranceTypeRow,
  EndorsementTypeRow,
  COIPolicyRow,
} from "../../../lib/coi";

function iso(d: string) {
  return d || "";
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseLimitSchemaKeys(limit_schema: any): { key: string; label: string }[] {
  if (!limit_schema) return [];
  try {
    if (Array.isArray(limit_schema)) {
      return limit_schema.map((k) => ({ key: String(k), label: String(k) }));
    }
    if (typeof limit_schema === "object" && Array.isArray(limit_schema.fields)) {
      return limit_schema.fields.map((f: any) => ({
        key: String(f.key),
        label: String(f.label ?? f.key),
      }));
    }
    if (typeof limit_schema === "object") {
      return Object.keys(limit_schema).map((k) => ({
        key: k,
        label: String((limit_schema as any)[k] ?? k),
      }));
    }
  } catch {}
  return [];
}

export default function ContractorCOIPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [companyId, setCompanyId] = useState<string | null>(null);

  // COI header
  const [coi, setCoi] = useState<COIRow | null>(null);
  const [issueDate, setIssueDate] = useState<string>(todayISO());
  const [expDate, setExpDate] = useState<string>("");
  const [carrierName, setCarrierName] = useState<string>("");
  const [amBest, setAmBest] = useState<string>("");
  const [admitted, setAdmitted] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);

  // reference data
  const [insuranceTypes, setInsuranceTypes] = useState<InsuranceTypeRow[]>([]);
  const [endorsementTypes, setEndorsementTypes] = useState<EndorsementTypeRow[]>([]);

  // policies & endorsements
  const [policies, setPolicies] = useState<COIPolicyRow[]>([]);
  const [endorsementCodes, setEndorsementCodes] = useState<string[]>([]);
  const [noticeDays, setNoticeDays] = useState<number>(30);

  // policy editor
  const [selectedInsuranceTypeId, setSelectedInsuranceTypeId] = useState<string>("");
  const [policyIssue, setPolicyIssue] = useState<string>(todayISO());
  const [policyExp, setPolicyExp] = useState<string>("");
  const [policyNumber, setPolicyNumber] = useState<string>("");
  const [limits, setLimits] = useState<Record<string, string>>({});

  const selectedInsuranceType = useMemo(
    () => insuranceTypes.find((x) => x.id === selectedInsuranceTypeId) || null,
    [insuranceTypes, selectedInsuranceTypeId]
  );

  const limitFields = useMemo(() => {
    return parseLimitSchemaKeys(selectedInsuranceType?.limit_schema);
  }, [selectedInsuranceType]);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const profile = await getMyProfile();
      if (!profile) return router.replace("/login");
      if (profile.role !== "contractor") return router.replace("/dashboard");

      const myCompany = await getMyCompany();
      if (!myCompany) {
        setErr("Create your company first in Contractor cabinet.");
        setLoading(false);
        return;
      }
      setCompanyId(myCompany.id);

      const [it, et, coi0] = await Promise.all([
        listInsuranceTypes(),
        listEndorsementTypes(),
        getMyCOI(myCompany.id),
      ]);
      setInsuranceTypes(it);
      setEndorsementTypes(et);

      if (coi0) {
        setCoi(coi0);
        setIssueDate(coi0.issue_date ?? todayISO());
        setExpDate(coi0.expiration_date ?? "");
        setCarrierName(coi0.carrier_name ?? "");
        setAmBest(coi0.am_best_rating ?? "");
        setAdmitted(!!coi0.admitted_carrier);

        const [p, e] = await Promise.all([
          listCOIPolicies(coi0.id),
          listCOIEndorsements(coi0.id),
        ]);
        setPolicies(p);
        setEndorsementCodes(e.codes);
        setNoticeDays(e.noticeDays ?? 30);
      } else {
        setCoi(null);
        setPolicies([]);
        setEndorsementCodes([]);
        setNoticeDays(30);
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

  function toggleEndorsement(code: string, checked: boolean) {
    setEndorsementCodes((prev) => {
      if (checked) return prev.includes(code) ? prev : [...prev, code];
      return prev.filter((x) => x !== code);
    });
  }

  // ✅ NEW: upload via /api/coi/signed-upload (private bucket, no storage policies)
 async function uploadToStorage(company_id: string): Promise<string | null> {
  if (!file) return null;

  // 1) take user session token
  const { data: sessData, error: sessErr } = await supabase.auth.getSession();
  if (sessErr) throw sessErr;
  const accessToken = sessData.session?.access_token;
  if (!accessToken) throw new Error("No session token. Please login again.");

  // 2) ask server for signed upload
  const res = await fetch("/api/coi/signed-upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      companyId: company_id,
      filename: file.name,
      contentType: file.type || "application/pdf",
    }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Failed to create signed upload");

  const bucketName = "coi-files";
  const path = json.path as string;
  const token = json.token as string;

  // 3) upload using signed token (private bucket OK)
  const { error: upErr } = await supabase.storage
    .from(bucketName)
    .uploadToSignedUrl(path, token, file, {
      contentType: file.type || "application/pdf",
      upsert: false,
    });

  if (upErr) throw upErr;

  // 4) return stored path to save into contractor_coi.file_path
  return path;
}

  async function saveCOI() {
    if (!companyId) return;
    setErr(null);

    try {
      // ✅ use signed upload if a new file selected
      const filePath = await uploadToStorageSigned(companyId);

      const saved = await createOrUpdateMyCOI({
        company_id: companyId,
        issue_date: issueDate || null,
        expiration_date: expDate || null,
        carrier_name: carrierName || null,
        am_best_rating: amBest || null,
        admitted_carrier: admitted,
        file_path: filePath ?? coi?.file_path ?? null,
      });

      setCoi(saved);

      await saveCOIEndorsements(saved.id, endorsementCodes, noticeDays);

      const [p, e] = await Promise.all([listCOIPolicies(saved.id), listCOIEndorsements(saved.id)]);
      setPolicies(p);
      setEndorsementCodes(e.codes);
      setNoticeDays(e.noticeDays ?? 30);

      alert("COI saved");
    } catch (e: any) {
      setErr(e.message ?? "Save COI error");
    }
  }

  // ✅ FIXED: use your existing GET /api/coi/signed-url?coiId=... with Bearer token
  async function downloadCOI() {
    if (!coi?.id) return;
    setErr(null);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

      const res = await fetch(`/api/coi/signed-url?coiId=${encodeURIComponent(coi.id)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to get signed URL");

      const url = json.url as string;
      window.open(url, "_blank");
    } catch (e: any) {
      setErr(e.message ?? "Download error");
    }
  }

  async function addPolicy() {
    if (!coi?.id) return setErr("Save COI first.");
    if (!selectedInsuranceTypeId) return setErr("Select insurance type.");
    if (!policyExp) return setErr("Policy expiration date is required.");

    setErr(null);

    try {
      const limitsJson: any = {};
      Object.entries(limits).forEach(([k, v]) => {
        const num = v.replace(/[^0-9]/g, "");
        limitsJson[k] = num ? Number(num) : v;
      });

      await upsertCOIPolicy({
        coi_id: coi.id,
        insurance_type_id: selectedInsuranceTypeId,
        issue_date: policyIssue || null,
        expiration_date: policyExp || null,
        policy_number: policyNumber || null,
        limits: limitsJson,
      });

      const p = await listCOIPolicies(coi.id);
      setPolicies(p);

      setSelectedInsuranceTypeId("");
      setPolicyIssue(todayISO());
      setPolicyExp("");
      setPolicyNumber("");
      setLimits({});
    } catch (e: any) {
      setErr(e.message ?? "Add policy error");
    }
  }

  async function removePolicy(id: string) {
    if (!coi?.id) return;
    setErr(null);
    try {
      await deleteCOIPolicy(id);
      const p = await listCOIPolicies(coi.id);
      setPolicies(p);
    } catch (e: any) {
      setErr(e.message ?? "Delete policy error");
    }
  }

  const insuranceNameById = useMemo(() => {
    const m: Record<string, string> = {};
    insuranceTypes.forEach((x) => (m[x.id] = x.name));
    return m;
  }, [insuranceTypes]);

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">COI</h1>
        <a className="underline text-sm" href="/contractor">
          Back
        </a>
      </div>

      {loading && <p>Loading...</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      <section className="rounded border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Certificate of Insurance (COI)</h2>
          <div className="text-sm">
            Status: <b className="capitalize">{coi?.status ?? "draft"}</b>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs text-gray-600">Issue date</div>
            <input
              type="date"
              className="w-full rounded border p-2"
              value={iso(issueDate)}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>

          <div>
            <div className="text-xs text-gray-600">Expiration date</div>
            <input
              type="date"
              className="w-full rounded border p-2"
              value={iso(expDate)}
              onChange={(e) => setExpDate(e.target.value)}
            />
          </div>

          <div>
            <div className="text-xs text-gray-600">Carrier name</div>
            <input
              className="w-full rounded border p-2"
              placeholder="e.g. Travelers"
              value={carrierName}
              onChange={(e) => setCarrierName(e.target.value)}
            />
          </div>

          <div>
            <div className="text-xs text-gray-600">AM Best rating</div>
            <input
              className="w-full rounded border p-2"
              placeholder='e.g. "A-"'
              value={amBest}
              onChange={(e) => setAmBest(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={admitted}
              onChange={(e) => setAdmitted(e.target.checked)}
            />
            Admitted carrier
          </label>

          <div>
            <div className="text-xs text-gray-600">Upload COI PDF</div>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {coi?.file_path && (
              <div className="mt-2 flex items-center gap-2">
                <button className="rounded border px-3 py-1 text-sm" onClick={downloadCOI}>
                  Download current
                </button>
                <div className="text-xs text-gray-600 truncate">{coi.file_path}</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="rounded bg-black px-4 py-2 text-white" onClick={saveCOI}>
            Save COI
          </button>
          <button className="rounded border px-4 py-2" onClick={load}>
            Refresh
          </button>
        </div>

        <div className="rounded border p-3 space-y-3">
          <div className="font-semibold">Endorsements included in COI</div>
          <div className="grid gap-2 md:grid-cols-2">
            {endorsementTypes.map((e) => (
              <label key={e.code} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={endorsementCodes.includes(e.code)}
                  onChange={(ev) => toggleEndorsement(e.code, ev.target.checked)}
                />
                {e.name}
              </label>
            ))}
          </div>

          <div className="max-w-sm">
            <div className="text-xs text-gray-600">Notice of Cancellation (days)</div>
            <input
              className="w-full rounded border p-2"
              value={noticeDays}
              onChange={(e) => setNoticeDays(Number(e.target.value || "0"))}
            />
            <div className="text-xs text-gray-500 mt-1">
              (If required/used. We store one value for all endorsements.)
            </div>
          </div>
        </div>
      </section>

      <section className="rounded border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Policies listed on COI</h2>
          <div className="text-sm text-gray-600">
            Add each insurance policy (limits, numbers, dates)
          </div>
        </div>

        <div className="space-y-2">
          {policies.map((p) => (
            <div key={p.id} className="rounded border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm">
                    <b>{insuranceNameById[p.insurance_type_id] ?? "Insurance"}</b>
                  </div>
                  <div className="text-xs text-gray-600">
                    Policy #{p.policy_number || "-"} • {p.issue_date || "-"} → {p.expiration_date || "-"}
                  </div>
                </div>
                <button className="rounded border px-3 py-1 text-sm" onClick={() => removePolicy(p.id)}>
                  Delete
                </button>
              </div>

              <pre className="mt-2 text-xs bg-gray-50 rounded p-2 overflow-auto">
{JSON.stringify(p.limits ?? {}, null, 2)}
              </pre>
            </div>
          ))}

          {policies.length === 0 && (
            <div className="text-sm text-gray-600">No policies added yet.</div>
          )}
        </div>

        <div className="rounded border p-3 space-y-3">
          <div className="font-semibold">Add a policy</div>

          <select
            className="w-full rounded border p-2"
            value={selectedInsuranceTypeId}
            onChange={(e) => {
              setSelectedInsuranceTypeId(e.target.value);
              setLimits({});
            }}
          >
            <option value="">Select insurance type...</option>
            {insuranceTypes.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name}
              </option>
            ))}
          </select>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <div className="text-xs text-gray-600">Issue date</div>
              <input
                type="date"
                className="w-full rounded border p-2"
                value={iso(policyIssue)}
                onChange={(e) => setPolicyIssue(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs text-gray-600">Expiration date</div>
              <input
                type="date"
                className="w-full rounded border p-2"
                value={iso(policyExp)}
                onChange={(e) => setPolicyExp(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs text-gray-600">Policy number</div>
              <input
                className="w-full rounded border p-2"
                placeholder="e.g. ABC123..."
                value={policyNumber}
                onChange={(e) => setPolicyNumber(e.target.value)}
              />
            </div>
          </div>

          {selectedInsuranceTypeId && (
            <div className="rounded border p-3 space-y-2">
              <div className="text-sm font-semibold">Limits</div>

              {limitFields.length > 0 ? (
                <div className="grid gap-2 md:grid-cols-2">
                  {limitFields.map((f) => (
                    <div key={f.key}>
                      <div className="text-xs text-gray-600">{f.label}</div>
                      <input
                        className="w-full rounded border p-2"
                        placeholder="e.g. 1000000"
                        value={limits[f.key] ?? ""}
                        onChange={(e) =>
                          setLimits((prev) => ({ ...prev, [f.key]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-600">
                  No limit schema found for this insurance type. You can still add custom limits below:
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <input
                      className="rounded border p-2"
                      placeholder="Limit key (e.g. per_occurrence)"
                      onBlur={(e) => {
                        const k = e.target.value.trim();
                        if (!k) return;
                        setLimits((prev) => ({ ...prev, [k]: prev[k] ?? "" }));
                        e.target.value = "";
                      }}
                    />
                    <div className="text-xs text-gray-500">
                      Type a key, then it will appear as editable field.
                    </div>
                  </div>

                  {Object.keys(limits).length > 0 && (
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {Object.keys(limits).map((k) => (
                        <div key={k}>
                          <div className="text-xs text-gray-600">{k}</div>
                          <input
                            className="w-full rounded border p-2"
                            value={limits[k] ?? ""}
                            onChange={(e) =>
                              setLimits((prev) => ({ ...prev, [k]: e.target.value }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <button className="rounded bg-black px-4 py-2 text-white" onClick={addPolicy}>
            Add Policy
          </button>
        </div>
      </section>
    </main>
  );
}
