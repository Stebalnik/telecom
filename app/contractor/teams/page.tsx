"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { getMyProfile } from "../../../lib/profile";
import {
  getMyCompany,
  listTeams,
  listMembers,
  type Company,
  type Team,
  type TeamMember,
} from "../../../lib/contractor";
import { listMemberCerts, type DocumentRow } from "../../../lib/documents";

function StatusBadge({ status }: { status?: string | null }) {
  const normalized = (status || "").toLowerCase();

  const cls =
    normalized === "active" || normalized === "approved"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalized === "pending"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : normalized === "rejected" || normalized === "blocked"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}
    >
      {status || "Unknown"}
    </span>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-[#0A2E5C]">{value}</div>
      {hint ? <div className="mt-1 text-sm text-[#4B5563]">{hint}</div> : null}
    </div>
  );
}

export default function ContractorTeamsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [company, setCompany] = useState<Company | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  const [companyMembersByTeam, setCompanyMembersByTeam] = useState<
    Record<string, TeamMember[]>
  >({});
  const [companyCertsByMember, setCompanyCertsByMember] = useState<
    Record<string, DocumentRow[]>
  >({});

  async function loadPage() {
    setLoading(true);
    setErr(null);

    try {
      const { data } = await supabase.auth.getSession();

      if (!data.session?.user) {
        router.replace("/login");
        return;
      }

      const profile = await getMyProfile();

      if (!profile || profile.role !== "contractor") {
        router.replace("/dashboard");
        return;
      }

      const currentCompany = await getMyCompany();

      if (!currentCompany || currentCompany.onboarding_status === "draft") {
        router.replace("/contractor/onboarding/company");
        return;
      }

      setCompany(currentCompany);

      const companyTeams = await listTeams(currentCompany.id);
      setTeams(companyTeams);

      const nextMembersByTeam: Record<string, TeamMember[]> = {};
      const nextCertsByMember: Record<string, DocumentRow[]> = {};

      for (const team of companyTeams) {
        const members = await listMembers(team.id);
        nextMembersByTeam[team.id] = members;

        for (const member of members) {
          nextCertsByMember[member.id] = await listMemberCerts(member.id);
        }
      }

      setCompanyMembersByTeam(nextMembersByTeam);
      setCompanyCertsByMember(nextCertsByMember);

      if (companyTeams.length > 0) {
        setSelectedTeamId((prev) =>
          prev && companyTeams.some((t) => t.id === prev)
            ? prev
            : companyTeams[0].id
        );
      } else {
        setSelectedTeamId("");
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to load teams.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) || null,
    [teams, selectedTeamId]
  );

  const selectedTeamMembers = useMemo(
    () => (selectedTeamId ? companyMembersByTeam[selectedTeamId] || [] : []),
    [companyMembersByTeam, selectedTeamId]
  );

  const activeTeamsCount = useMemo(
    () =>
      teams.filter((team) => {
        const normalized = (team.status || "").toLowerCase();
        return normalized === "active" || normalized === "approved";
      }).length,
    [teams]
  );

  const totalMembersCount = useMemo(
    () =>
      Object.values(companyMembersByTeam).reduce(
        (sum, members) => sum + members.length,
        0
      ),
    [companyMembersByTeam]
  );

  const totalCertsCount = useMemo(
    () =>
      Object.values(companyCertsByMember).reduce(
        (sum, certs) => sum + certs.length,
        0
      ),
    [companyCertsByMember]
  );

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="LEOTEOR"
              width={24}
              height={24}
              className="h-6 w-6 rounded object-contain"
            />
            <div>
              <h1 className="text-2xl font-semibold text-[#0A2E5C]">Teams</h1>
              <p className="mt-1 text-sm text-[#4B5563]">
                Loading company teams...
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="LEOTEOR"
                width={24}
                height={24}
                className="h-6 w-6 rounded object-contain"
              />
              <span className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
                Contractor workspace
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#0A2E5C]">
              Teams
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
              View all company teams, review team composition, and keep crew
              structure organized for certifications, approvals, and job
              assignments.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/contractor/certifications"
              className="inline-flex items-center justify-center rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-semibold text-[#0A2E5C] transition hover:bg-[#F4F8FC]"
            >
              Open certifications
            </Link>

            <Link
              href="/contractor"
              className="inline-flex items-center justify-center rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-semibold text-[#0A2E5C] transition hover:bg-[#F4F8FC]"
            >
              Back to overview
            </Link>
          </div>
        </div>

        {err ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active teams"
          value={activeTeamsCount}
          hint={`${teams.length} teams total`}
        />
        <StatCard
          label="Employees in teams"
          value={totalMembersCount}
          hint="Across all company teams"
        />
        <StatCard
          label="Certificates"
          value={totalCertsCount}
          hint="Across all team members"
        />
        <StatCard
          label="Selected team"
          value={selectedTeam?.name || "—"}
          hint={selectedTeam?.status || "No team selected"}
        />
      </section>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0A2E5C]">
              Create team
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#4B5563]">
              Creating a team happens on a separate page. You will enter the
              team name and all initial team members there. After the team is
              created, team composition can only be changed through an admin
              request with reason.
            </p>
          </div>

          <Link
            href="/contractor/teams/new"
            className="inline-flex items-center justify-center rounded-xl bg-[#2EA3FF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
          >
            Create team
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#0A2E5C]">Teams list</h2>

        <div className="mt-4 space-y-3">
          {teams.length === 0 ? (
            <div className="rounded-xl border border-[#D9E2EC] bg-[#F9FBFD] px-4 py-6 text-sm text-[#4B5563]">
              No teams yet.
            </div>
          ) : (
            teams.map((team) => {
              const members = companyMembersByTeam[team.id] || [];

              return (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  disabled={busy}
                  className={`block w-full rounded-xl border p-4 text-left transition ${
                    selectedTeamId === team.id
                      ? "border-[#8FC8FF] bg-[#EAF3FF]"
                      : "border-[#D9E2EC] bg-[#F9FBFD] hover:bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-[#111827]">
                        {team.name}
                      </div>
                      <div className="mt-1 text-sm text-[#4B5563]">
                        {members.length} members
                      </div>
                    </div>

                    <StatusBadge status={team.status} />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0A2E5C]">
              Selected team members
            </h2>
            <p className="mt-1 text-sm text-[#4B5563]">
              Team:{" "}
              <span className="font-medium text-[#111827]">
                {selectedTeam?.name || "None selected"}
              </span>
            </p>
          </div>

          {selectedTeam ? (
            <Link
              href="/contractor/teams/change-request"
              className="text-sm font-medium text-[#1F6FB5] hover:text-[#0A2E5C]"
            >
              Request team composition change
            </Link>
          ) : null}
        </div>

        <div className="mt-4 space-y-3">
          {selectedTeamMembers.length === 0 ? (
            <div className="rounded-xl border border-[#D9E2EC] bg-[#F9FBFD] px-4 py-6 text-sm text-[#4B5563]">
              No members in selected team.
            </div>
          ) : (
            selectedTeamMembers.map((member) => {
              const certs = companyCertsByMember[member.id] || [];

              return (
                <div
                  key={member.id}
                  className="rounded-xl border border-[#D9E2EC] bg-[#F9FBFD] p-4"
                >
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div>
                      <div className="text-sm font-semibold text-[#111827]">
                        {member.full_name}
                      </div>

                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-[#4B5563]">
                            Role
                          </div>
                          <div className="mt-1 text-sm text-[#111827]">
                            {member.role_title || "—"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs uppercase tracking-wide text-[#4B5563]">
                            Phone
                          </div>
                          <div className="mt-1 text-sm text-[#111827]">
                            {member.phone || "—"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs uppercase tracking-wide text-[#4B5563]">
                            Email
                          </div>
                          <div className="mt-1 text-sm text-[#111827]">
                            {member.email || "—"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs uppercase tracking-wide text-[#4B5563]">
                            Date of birth
                          </div>
                          <div className="mt-1 text-sm text-[#111827]">
                            {member.date_of_birth || "—"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#D9E2EC] bg-white p-4">
                      <div className="text-xs uppercase tracking-wide text-[#4B5563]">
                        Certificates
                      </div>
                      <div className="mt-2 text-lg font-semibold text-[#111827]">
                        {certs.length}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}