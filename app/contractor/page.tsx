"use client";

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
      const c = await getMyCompany();
      setCompany(c);

      if (c) {
        setLegalName(c.legal_name);
        setDbaName(c.dba_name || "");

        const t = await listTeams(c.id);
        setTeams(t);

        if (t.length > 0) {
          const teamId = selectedTeamId || t[0].id;
          setSelectedTeamId(teamId);
          const m = await listMembers(teamId);
          setMembers(m);
        } else {
          setSelectedTeamId(null);
          setMembers([]);
        }
      } else {
        setTeams([]);
        setSelectedTeamId(null);
        setMembers([]);
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
    try {
      const m = await listMembers(teamId);
      setMembers(m);
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
      const m = await listMembers(selectedTeamId);
      setMembers(m);
    } catch (e: any) {
      setErr(e.message ?? "Add member error");
    }
  }

  return (
    <main className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Contractor кабинет</h1>
        <a className="underline" href="/dashboard">
          Back
        </a>
      </div>

      {loading && <p>Loading...</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {/* Company */}
      <section className="rounded border p-4">
        <h2 className="text-lg font-semibold">1) Company</h2>
        <p className="mt-1 text-sm text-gray-600">
          Start here: create your contractor company profile.
        </p>

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

          {company && (
            <p className="text-sm text-gray-600">
              Status: <b>{company.status}</b>
              {company.status === "blocked" && company.block_reason
                ? ` — ${company.block_reason}`
                : ""}
            </p>
          )}
        </div>
      </section>

      {/* Teams */}
      <section className="rounded border p-4">
        <h2 className="text-lg font-semibold">2) Teams</h2>
        <p className="mt-1 text-sm text-gray-600">
          Create teams (e.g. Team A, Tower Crew 1).
        </p>

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
          {teams.length === 0 && <p className="text-sm text-gray-600">No teams yet.</p>}

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
              {t.status === "blocked" && t.block_reason && (
                <div className="mt-1 text-sm text-red-600">{t.block_reason}</div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Members */}
      <section className="rounded border p-4">
        <h2 className="text-lg font-semibold">3) Team members</h2>
        <p className="mt-1 text-sm text-gray-600">
          Add people to the selected team (later we’ll upload their certificates).
        </p>

        <p className="mt-3 text-sm">
          Selected team: <b>{selectedTeam ? selectedTeam.name : "None"}</b>
        </p>

        <div className="mt-4 grid gap-2 md:grid-cols-2">
          <input
            className="rounded border p-2"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            placeholder="Full name (e.g. John Doe)"
          />
          <input
            className="rounded border p-2"
            value={memberRole}
            onChange={(e) => setMemberRole(e.target.value)}
            placeholder="Role title (e.g. Tower Tech)"
          />
        </div>

        <button
          className="mt-3 rounded bg-black px-4 py-2 text-white"
          onClick={handleAddMember}
        >
          Add member
        </button>

        <div className="mt-4 grid gap-2">
          {members.length === 0 && (
            <p className="text-sm text-gray-600">No team members yet.</p>
          )}

          {members.map((m) => (
            <div key={m.id} className="rounded border p-3">
              <b>{m.full_name}</b>
              {m.role_title ? <div className="text-sm text-gray-600">{m.role_title}</div> : null}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
