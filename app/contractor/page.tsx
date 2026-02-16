"use client";
<a className="underline" href="/contractor/jobs">Open jobs</a>



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

  // Documents UI state
  const [insuranceTypes, setInsuranceTypes] = useState<InsuranceType[]>([]);
  const [certTypes, setCertTypes] = useState<CertType[]>([]);
  const [companyInsurance, setCompanyInsurance] = useState<DocumentRow[]>([]);
  const [memberCerts, setMemberCerts] = useState<Record<string, DocumentRow[]>>({});

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
      const [insT, certT] = await Promise.all([listInsuranceTypes(), listCertTypes()]);
      setInsuranceTypes(insT);
      setCertTypes(certT);

      const c = await getMyCompany();
      setCompany(c);

      if (c) {
        setLegalName(c.legal_name);
        setDbaName(c.dba_name || "");

        const t = await listTeams(c.id);
        setTeams(t);

        // insurance list
        const ins = await listCompanyInsurance(c.id);
        setCompanyInsurance(ins);

        if (t.length > 0) {
          const teamId = selectedTeamId || t[0].id;
          setSelectedTeamId(teamId);
          const m = await listMembers(teamId);
          setMembers(m);

          // load certs for members (simple approach)
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
      } else {
        setTeams([]);
        setSelectedTeamId(null);
        setMembers([]);
        setCompanyInsurance([]);
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
        setErr("Create company first.");
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
      if (!company) return setErr("Create company first.");
      if (!insTypeId) return setErr("Select insurance type.");
      if (!insExpiresAt) return setErr("Set expiration date.");
      if (!insFile) return setErr("Choose a file.");

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
      if (!certMemberId) return setErr("Select member.");
      if (!certTypeId) return setErr("Select certificate type.");
      if (!certExpiresAt) return setErr("Set expiration date.");
      if (!certFile) return setErr("Choose a file.");

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Contractor cabinet</h1>
        <a className="rounded bg-black px-4 py-2 text-white" href="/contractor/jobs"> Browse Jobs </a>
        <a className="block rounded bg-black px-4 py-2 text-white text-center" href="/contractor/customers">
  Customers (Apply)
</a>
        <a className="underline" href="/dashboard">
          Back
        </a>
        
      </div>

      {loading && <p>Loading...</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {/* Company */}
      <section className="rounded border p-4">
        <h2 className="text-lg font-semibold">1) Company</h2>

        <div className="mt-4 grid gap-3">
          <div>
            <label className="block text-sm">Legal name *</label>
            <input
              className="mt-1 w-full rounded border p-2"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="Leoteor LLC"
            />
          </div>

          <div>
            <label className="block text-sm">DBA name</label>
            <input
              className="mt-1 w-full rounded border p-2"
              value={dbaName}
              onChange={(e) => setDbaName(e.target.value)}
              placeholder="IronPeak Build (optional)"
            />
          </div>

          <button
            className="w-fit rounded bg-black px-4 py-2 text-white"
            onClick={handleSaveCompany}
          >
            {company ? "Update company" : "Create company"}
          </button>
        </div>
        {company && (
  <p className="text-sm text-gray-600">
    Company status: <b>{company.status}</b>
    {company.status === "blocked" && company.block_reason ? ` — ${company.block_reason}` : ""}
  </p>
)}

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

        <button className="mt-3 rounded bg-black px-4 py-2 text-white" onClick={uploadInsurance}>
          Upload insurance
        </button>
<button
  className="mt-3 rounded border px-4 py-2 text-sm"
  onClick={async () => {
    try {
      if (!company) return;
      await recalcCompanyStatus(company.id);
      await loadAll();
    } catch (e: any) {
      setErr(e.message ?? "Recalc error");
    }
  }}
>
  Recalculate company eligibility
</button>

        <div className="mt-4 grid gap-2">
          {companyInsurance.length === 0 ? (
            <p className="text-sm text-gray-600">No insurance documents yet.</p>
          ) : (
            companyInsurance.map((d) => (
              <div key={d.id} className="rounded border p-3">
                <div className="flex items-center justify-between">
                  <b>{d.insurance_type?.name ?? "Insurance"}</b>
                  <span className="text-sm">{d.verification_status}</span>
                </div>
                <div className="text-sm text-gray-600">Expires: {d.expires_at}</div>
                {d.verification_note && (
                  <div className="text-sm text-red-600">{d.verification_note}</div>
                )}
                <a className="text-sm underline" href={d.file_public_url} target="_blank">
                  Open file
                </a>
                {(d.verification_status === "rejected" || d.verification_status === "pending") && (
  <button
    className="mt-2 rounded border px-3 py-1 text-sm"
    onClick={async () => {
      try {
        await deleteDocument({ id: d.id, file_path: d.file_path });
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
          <button className="rounded bg-black px-4 py-2 text-white" onClick={handleAddTeam}>
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
          {teams.length === 0 && <p className="text-sm text-gray-600">No teams yet.</p>}
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

        <button className="mt-3 rounded bg-black px-4 py-2 text-white" onClick={handleAddMember}>
          Add member
        </button>

        <div className="mt-4 grid gap-2">
          {members.map((m) => (
            <div key={m.id} className="rounded border p-3">
              <div className="flex items-center justify-between">
                <b>{m.full_name}</b>
                <span className="text-sm text-gray-600">{m.role_title || ""}</span>
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
                    <div className="text-sm text-red-600">{d.verification_note}</div>
                  )}
                  <a className="text-sm underline" href={d.file_public_url} target="_blank">
                    Open file
                  </a>
                  {(d.verification_status === "rejected" || d.verification_status === "pending") && (
  <button
    className="mt-2 rounded border px-3 py-1 text-sm"
    onClick={async () => {
      try {
        await deleteDocument({ id: d.id, file_path: d.file_path });
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
          {members.length === 0 && <p className="text-sm text-gray-600">No members yet.</p>}
        </div>
      </section>

      {/* Upload cert */}
      <section className="rounded border p-4">
        <h2 className="text-lg font-semibold">5) Upload certificate for a member</h2>

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

        <button className="mt-3 rounded bg-black px-4 py-2 text-white" onClick={uploadCert}>
          Upload certificate
        </button>
      </section>
    </main>
  )
}
