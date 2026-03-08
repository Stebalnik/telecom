"use client";

import Link from "next/link";
import { recalcCompanyStatus } from "../../lib/eligibility";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile } from "../../lib/profile";
import { supabase } from "../../lib/supabaseClient";
import {
  Company,
  Team,
  TeamMember,
  createCompany,
  createMember,
  createTeam,
  getMyCompany,
  listMembers,
  listTeams,
  updateCompany,
} from "../../lib/contractor";
import {
  CertType,
  DocumentRow,
  InsuranceType,
  createCertDocument,
  createInsuranceDocument,
  deleteDocument,
  listCertTypes,
  listCompanyInsurance,
  listInsuranceTypes,
  listMemberCerts,
} from "../../lib/documents";

export default function ContractorPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [company, setCompany] = useState<Company | null>(null);
  const [legalName, setLegalName] = useState("");
  const [dbaName, setDbaName] = useState("");

  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState("");

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("");

  const [insuranceTypes, setInsuranceTypes] = useState<InsuranceType[]>([]);
  const [certTypes, setCertTypes] = useState<CertType[]>([]);
  const [companyInsurance, setCompanyInsurance] = useState<DocumentRow[]>([]);
  const [memberCerts, setMemberCerts] = useState<Record<string, DocumentRow[]>>(
    {}
  );

  const [insTypeId, setInsTypeId] = useState("");
  const [insExpiresAt, setInsExpiresAt] = useState("");
  const [insFile, setInsFile] = useState<File | null>(null);

  const [certTypeId, setCertTypeId] = useState("");
  const [certExpiresAt, setCertExpiresAt] = useState("");
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certMemberId, setCertMemberId] = useState<string>("");

  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === selectedTeamId) || null,
    [teams, selectedTeamId]
  );

  async function loadAll() {
    setLoading(true);
    setErr(null);

    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.replace("/login");
      return;
    }

    const profile = await getMyProfile();
    if (!profile || profile.role !== "contractor") {
      router.replace("/dashboard");
      return;
    }

    try {
      const [insT, certT] = await Promise.all([
        listInsuranceTypes(),
        listCertTypes(),
      ]);
      setInsuranceTypes(insT);
      setCertTypes(certT);

      const c = await getMyCompany();

      // если компании нет или она в draft — отправляем на onboarding
      if (!c || c.onboarding_status === "draft") {
        router.replace("/contractor/onboarding/company");
        return;
      }

      setCompany(c);
      setLegalName(c.legal_name || "");
      setDbaName(c.dba_name || "");

      const t = await listTeams(c.id);
      setTeams(t);

      const ins = await listCompanyInsurance(c.id);
      setCompanyInsurance(ins);

      if (t.length > 0) {
        const teamId = selectedTeamId || t[0].id;
        setSelectedTeamId(teamId);

        const m = await listMembers(teamId);
        setMembers(m);

        const certMap: Record<string, DocumentRow[]> = {};
        for (const person of m) {
          certMap[person.id] = await listMemberCerts(person.id);
        }
        setMemberCerts(certMap);

        if (!certMemberId && m[0]) setCertMemberId(m[0].id);
      } else {
        setSelectedTeamId(null);
        setMembers([]);
        setMemberCerts({});
      }
    } catch (e: any) {
      setErr(e.message ?? "Load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveCompany() {
    setErr(null);

    try {
      if (!legalName.trim()) {
        setErr("Legal name is required.");
        return;
      }

      if (!company) {
        await createCompany(legalName.trim(), dbaName.trim());
      } else {
        await updateCompany(company.id, legalName.trim(), dbaName.trim());
      }

      await loadAll();
    } catch (e: any) {
      setErr(e.message ?? "Save error");
    }
  }

  async function handleAddTeam() {
    setErr(null);

    try {
      if (!company) {
        setErr("Company is required.");
        return;
      }

      if (!newTeamName.trim()) {
        setErr("Team name is required.");
        return;
      }

      await createTeam(company.id, newTeamName.trim());
      setNewTeamName("");
      await loadAll();
    } catch (e: any) {
      setErr(e.message ?? "Add team error");
    }
  }

  async function handleSelectTeam(teamId: string) {
    setSelectedTeamId(teamId);
    setErr(null);

    try {
      const m = await listMembers(teamId);
      setMembers(m);

      const certMap: Record<string, DocumentRow[]> = {};
      for (const person of m) {
        certMap[person.id] = await listMemberCerts(person.id);
      }
      setMemberCerts(certMap);

      if (m[0]) setCertMemberId(m[0].id);
    } catch (e: any) {
      setErr(e.message ?? "Load members error");
    }
  }

  async function handleAddMember() {
    setErr(null);

    try {
      if (!selectedTeamId) {
        setErr("Select a team first.");
        return;
      }

      if (!memberName.trim()) {
        setErr("Member full name is required.");
        return;
      }

      await createMember(selectedTeamId, memberName.trim(), memberRole.trim());
      setMemberName("");
      setMemberRole("");
      await loadAll();
    } catch (e: any) {
      setErr(e.message ?? "Add member error");
    }
  }

  async function uploadInsurance() {
    setErr(null);

    try {
      if (!company) {
        setErr("Company is required.");
        return;
      }
      if (!insTypeId) {
        setErr("Select insurance type.");
        return;
      }
      if (!insExpiresAt) {
        setErr("Set expiration date.");
        return;
      }
      if (!insFile) {
        setErr("Choose a file.");
        return;
      }

      await createInsuranceDocument({
        companyId: company.id,
        insuranceTypeId: insTypeId,
        expiresAt: insExpiresAt,
        file: insFile,
      });

      setInsFile(null);
      setInsExpiresAt("");
      setInsTypeId("");
      await loadAll();
    } catch (e: any) {
      setErr(e.message ?? "Upload insurance error");
    }
  }

  async function uploadCert() {
    setErr(null);

    try {
      if (!certMemberId) {
        setErr("Select member.");
        return;
      }
      if (!certTypeId) {
        setErr("Select certificate type.");
        return;
      }
      if (!certExpiresAt) {
        setErr("Set expiration date.");
        return;
      }
      if (!certFile) {
        setErr("Choose a file.");
        return;
      }

      await createCertDocument({
        memberId: certMemberId,
        certTypeId,
        expiresAt: certExpiresAt,
        file: certFile,
      });

      setCertFile(null);
      setCertExpiresAt("");
      setCertTypeId("");
      await loadAll();
    } catch (e: any) {
      setErr(e.message ?? "Upload certificate error");
    }
  }

  return (
    <main className="p-6 space-y-8">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h1 className="text-2xl font-semibold">Contractor cabinet</h1>

        <div className="flex flex-wrap gap-2">
  <Link
    className="rounded bg-black px-4 py-2 text-white"
    href="/contractor/jobs"
  >
    Browse Jobs
  </Link>

  <Link
    className="rounded bg-black px-4 py-2 text-white"
    href="/contractor/customers"
  >
    Customers (Apply)
  </Link>

  <Link
    className="rounded bg-black px-4 py-2 text-white"
    href="/contractor/coi"
  >
    COI (Upload + Policies)
  </Link>

  <Link
  className="rounded bg-black px-4 py-2 text-white"
  href="/contractor/settings/company"
>
  Company Settings
</Link>

  <Link className="underline px-2 py-2" href="/dashboard">
    Back
  </Link>
</div>
      </div>

      {loading && <p>Loading...</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {!loading && company && (
        <>
          {/* Company */}
         <section className="rounded border p-4">
  <div className="flex items-start justify-between gap-4">
    <div>
      <h2 className="text-lg font-semibold">1) Company</h2>
      <p className="mt-1 text-sm text-gray-600">
        Company data is locked after onboarding submission.
      </p>
    </div>

    <Link
      href="/contractor/settings/company"
      className="rounded border px-4 py-2 text-sm"
    >
      Request company data change
    </Link>
  </div>

  <div className="mt-4 grid gap-4 md:grid-cols-2">
    <div className="rounded border p-3">
      <div className="text-xs uppercase text-gray-500">Legal name</div>
      <div className="mt-1 font-medium">{company.legal_name || "—"}</div>
    </div>

    <div className="rounded border p-3">
      <div className="text-xs uppercase text-gray-500">DBA</div>
      <div className="mt-1 font-medium">{company.dba_name || "—"}</div>
    </div>

    {"fein" in company && (
      <div className="rounded border p-3">
        <div className="text-xs uppercase text-gray-500">FEIN / Tax ID</div>
        <div className="mt-1 font-medium">{(company as any).fein || "—"}</div>
      </div>
    )}

    {"email" in company && (
      <div className="rounded border p-3">
        <div className="text-xs uppercase text-gray-500">Email</div>
        <div className="mt-1 font-medium">{(company as any).email || "—"}</div>
      </div>
    )}

    {"phone" in company && (
      <div className="rounded border p-3">
        <div className="text-xs uppercase text-gray-500">Phone</div>
        <div className="mt-1 font-medium">{(company as any).phone || "—"}</div>
      </div>
    )}

    {"country" in company && (
      <div className="rounded border p-3">
        <div className="text-xs uppercase text-gray-500">Country</div>
        <div className="mt-1 font-medium">{(company as any).country || "—"}</div>
      </div>
    )}

    {("address_line1" in company ||
      "city" in company ||
      "state" in company ||
      "zip" in company) && (
      <div className="rounded border p-3 md:col-span-2">
        <div className="text-xs uppercase text-gray-500">Address</div>
        <div className="mt-1 font-medium">
          {[
            (company as any).address_line1,
            (company as any).address_line2,
            [ (company as any).city, (company as any).state, (company as any).zip ]
              .filter(Boolean)
              .join(", "),
            (company as any).country,
          ]
            .filter(Boolean)
            .join(" | ") || "—"}
        </div>
      </div>
    )}

    {("bank_account_holder" in company ||
      "bank_routing" in company ||
      "bank_account" in company) && (
      <div className="rounded border p-3 md:col-span-2">
        <div className="text-xs uppercase text-gray-500">Payout details</div>
        <div className="mt-1 text-sm text-gray-700">
          <div>
            <span className="font-medium">Account holder:</span>{" "}
            {(company as any).bank_account_holder || "—"}
          </div>
          <div>
            <span className="font-medium">Routing:</span>{" "}
            {(company as any).bank_routing || "—"}
          </div>
          <div>
            <span className="font-medium">Account:</span>{" "}
            {(company as any).bank_account
              ? `••••${String((company as any).bank_account).slice(-4)}`
              : "—"}
          </div>
        </div>
      </div>
    )}
  </div>

  <div className="mt-4 space-y-1 text-sm text-gray-600">
    <p>
      Company status: <b>{company.status}</b>
      {company.status === "blocked" && company.block_reason
        ? ` — ${company.block_reason}`
        : ""}
    </p>

    {"onboarding_status" in company && (
      <p>
        Onboarding status: <b>{String((company as any).onboarding_status)}</b>
      </p>
    )}
  </div>
</section>

          {/* Insurance */}
          <section className="rounded border p-4">
            <h2 className="text-lg font-semibold">2) Insurance (upload)</h2>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div>
                <label className="block text-sm">Insurance type</label>
                <select
                  className="mt-1 w-full rounded border p-2"
                  value={insTypeId}
                  onChange={(e) => setInsTypeId(e.target.value)}
                >
                  <option value="">Select...</option>
                  {insuranceTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm">Expires at</label>
                <input
                  className="mt-1 w-full rounded border p-2"
                  type="date"
                  value={insExpiresAt}
                  onChange={(e) => setInsExpiresAt(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm">File</label>
                <input
                  className="mt-1 w-full rounded border p-2"
                  type="file"
                  onChange={(e) => setInsFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="rounded bg-black px-4 py-2 text-white"
                onClick={uploadInsurance}
              >
                Upload insurance
              </button>

              <button
                className="rounded border px-4 py-2 text-sm"
                onClick={async () => {
                  try {
                    await recalcCompanyStatus(company.id);
                    await loadAll();
                  } catch (e: any) {
                    setErr(e.message ?? "Recalc error");
                  }
                }}
              >
                Recalculate company eligibility
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              {companyInsurance.length === 0 ? (
                <p className="text-sm text-gray-600">
                  No insurance documents yet.
                </p>
              ) : (
                companyInsurance.map((d) => (
                  <div key={d.id} className="rounded border p-3">
                    <div className="flex items-center justify-between">
                      <b>{d.insurance_type?.name ?? "Insurance"}</b>
                      <span className="text-sm">{d.verification_status}</span>
                    </div>

                    <div className="text-sm text-gray-600">
                      Expires: {d.expires_at}
                    </div>

                    {d.verification_note && (
                      <div className="text-sm text-red-600">
                        {d.verification_note}
                      </div>
                    )}

                    <a
                      className="text-sm underline"
                      href={d.file_public_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open file
                    </a>

                    {(d.verification_status === "rejected" ||
                      d.verification_status === "pending") && (
                      <button
                        className="mt-2 block rounded border px-3 py-1 text-sm"
                        onClick={async () => {
                          try {
                            await deleteDocument({
                              id: d.id,
                              file_path: d.file_path,
                            });
                            await loadAll();
                          } catch (e: any) {
                            setErr(e.message ?? "Delete error");
                          }
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Teams */}
          <section className="rounded border p-4">
            <h2 className="text-lg font-semibold">3) Teams</h2>

            <div className="mt-4 flex gap-2">
              <input
                className="w-full rounded border p-2"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Team name"
              />
              <button
                className="rounded bg-black px-4 py-2 text-white"
                onClick={handleAddTeam}
              >
                Add team
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              {teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTeam(t.id)}
                  className={`rounded border p-3 text-left ${
                    selectedTeamId === t.id ? "border-black" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <b>{t.name}</b>
                    <span className="text-sm text-gray-600">{t.status}</span>
                  </div>
                </button>
              ))}

              {teams.length === 0 && (
                <p className="text-sm text-gray-600">No teams yet.</p>
              )}
            </div>
          </section>

          {/* Members */}
          <section className="rounded border p-4">
            <h2 className="text-lg font-semibold">4) Team members</h2>
            <p className="mt-1 text-sm">
              Selected team: <b>{selectedTeam ? selectedTeam.name : "None"}</b>
            </p>

            <div className="mt-4 grid gap-2 md:grid-cols-2">
              <input
                className="rounded border p-2"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="Full name"
              />
              <input
                className="rounded border p-2"
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value)}
                placeholder="Role title"
              />
            </div>

            <button
              className="mt-3 rounded bg-black px-4 py-2 text-white"
              onClick={handleAddMember}
            >
              Add member
            </button>

            <div className="mt-4 grid gap-2">
              {members.map((m) => (
                <div key={m.id} className="rounded border p-3">
                  <div className="flex items-center justify-between">
                    <b>{m.full_name}</b>
                    <span className="text-sm text-gray-600">
                      {m.role_title || ""}
                    </span>
                  </div>

                  <div className="mt-2 text-sm text-gray-600">
                    Certificates: {memberCerts[m.id]?.length || 0}
                  </div>

                  {(memberCerts[m.id] || []).map((d) => (
                    <div key={d.id} className="mt-2 rounded border p-2">
                      <div className="text-sm">
                        <b>{d.cert_type?.name ?? "Certificate"}</b>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm">{d.verification_status}</span>
                        <span className="text-sm">exp {d.expires_at}</span>
                      </div>

                      {d.verification_note && (
                        <div className="text-sm text-red-600">
                          {d.verification_note}
                        </div>
                      )}

                      <a
                        className="text-sm underline"
                        href={d.file_public_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open file
                      </a>

                      {(d.verification_status === "rejected" ||
                        d.verification_status === "pending") && (
                        <button
                          className="mt-2 block rounded border px-3 py-1 text-sm"
                          onClick={async () => {
                            try {
                              await deleteDocument({
                                id: d.id,
                                file_path: d.file_path,
                              });
                              await loadAll();
                            } catch (e: any) {
                              setErr(e.message ?? "Delete error");
                            }
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ))}

              {members.length === 0 && (
                <p className="text-sm text-gray-600">No members yet.</p>
              )}
            </div>
          </section>

          {/* Upload cert */}
          <section className="rounded border p-4">
            <h2 className="text-lg font-semibold">
              5) Upload certificate for a member
            </h2>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div>
                <label className="block text-sm">Member</label>
                <select
                  className="mt-1 w-full rounded border p-2"
                  value={certMemberId}
                  onChange={(e) => setCertMemberId(e.target.value)}
                >
                  <option value="">Select...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm">Certificate type</label>
                <select
                  className="mt-1 w-full rounded border p-2"
                  value={certTypeId}
                  onChange={(e) => setCertTypeId(e.target.value)}
                >
                  <option value="">Select...</option>
                  {certTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm">Expires at</label>
                <input
                  className="mt-1 w-full rounded border p-2"
                  type="date"
                  value={certExpiresAt}
                  onChange={(e) => setCertExpiresAt(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm">File</label>
                <input
                  className="mt-1 w-full rounded border p-2"
                  type="file"
                  onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <button
              className="mt-3 rounded bg-black px-4 py-2 text-white"
              onClick={uploadCert}
            >
              Upload certificate
            </button>
          </section>
        </>
      )}
    </main>
  );
}