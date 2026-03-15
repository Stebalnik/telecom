"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { getMyProfile } from "../../../../lib/profile";
import {
  createTeamChangeRequest,
  getMyCompany,
  listMembers,
  listTeams,
  type Company,
  type Team,
  type TeamMember,
} from "../../../../lib/contractor";

type DraftMember = {
  full_name: string;
  role_title: string;
  phone: string;
  email: string;
  date_of_birth: string;
};

function emptyMember(): DraftMember {
  return {
    full_name: "",
    role_title: "",
    phone: "",
    email: "",
    date_of_birth: "",
  };
}

export default function ContractorTeamChangeRequestPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [company, setCompany] = useState<Company | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [currentMembers, setCurrentMembers] = useState<TeamMember[]>([]);
  const [reason, setReason] = useState("");
  const [proposedMembers, setProposedMembers] = useState<DraftMember[]>([
    emptyMember(),
  ]);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) || null,
    [teams, selectedTeamId]
  );

  async function loadCurrentMembers(teamId: string) {
    const members = await listMembers(teamId);
    setCurrentMembers(members);

    if (members.length > 0) {
      setProposedMembers(
        members.map((member) => ({
          full_name: member.full_name || "",
          role_title: member.role_title || "",
          phone: member.phone || "",
          email: member.email || "",
          date_of_birth: member.date_of_birth || "",
        }))
      );
    } else {
      setProposedMembers([emptyMember()]);
    }
  }

  useEffect(() => {
    async function load() {
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

        if (companyTeams.length > 0) {
          const firstTeamId = companyTeams[0].id;
          setSelectedTeamId(firstTeamId);
          await loadCurrentMembers(firstTeamId);
        } else {
          setSelectedTeamId("");
          setCurrentMembers([]);
          setProposedMembers([emptyMember()]);
        }
      } catch (e: any) {
        setErr(e?.message || "Failed to load team change request page.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  function updateProposedMember(
    index: number,
    field: keyof DraftMember,
    value: string
  ) {
    setProposedMembers((prev) =>
      prev.map((member, i) =>
        i === index ? { ...member, [field]: value } : member
      )
    );
  }

  function addMemberRow() {
    setProposedMembers((prev) => [...prev, emptyMember()]);
  }

  function removeMemberRow(index: number) {
    setProposedMembers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleTeamChange(teamId: string) {
    try {
      setErr(null);
      setSelectedTeamId(teamId);
      await loadCurrentMembers(teamId);
    } catch (e: any) {
      setErr(e?.message || "Failed to load selected team.");
    }
  }

  async function handleSubmitRequest() {
    try {
      setErr(null);

      if (!company) {
        setErr("Company is required.");
        return;
      }

      if (!selectedTeamId) {
        setErr("Select a team.");
        return;
      }

      if (!reason.trim()) {
        setErr("Reason is required.");
        return;
      }

      const validMembers = proposedMembers.filter((member) =>
        member.full_name.trim()
      );

      if (validMembers.length === 0) {
        setErr("Add at least one proposed team member.");
        return;
      }

      setSaving(true);

      await createTeamChangeRequest({
        companyId: company.id,
        teamId: selectedTeamId,
        reason: reason.trim(),
        members: validMembers.map((member) => ({
          full_name: member.full_name.trim(),
          role_title: member.role_title.trim(),
          phone: member.phone.trim(),
          email: member.email.trim().toLowerCase(),
          date_of_birth: member.date_of_birth,
        })),
      });

      router.push("/contractor/teams");
    } catch (e: any) {
      setErr(e?.message || "Failed to submit team change request.");
    } finally {
      setSaving(false);
    }
  }

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
              <h1 className="text-2xl font-semibold text-[#0A2E5C]">
                Team change request
              </h1>
              <p className="mt-1 text-sm text-[#4B5563]">Loading page...</p>
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
              Team change request
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
              Submit a request to change team composition. The request will be
              reviewed by admin before any changes are approved.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/contractor/teams"
              className="inline-flex items-center justify-center rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-semibold text-[#0A2E5C] transition hover:bg-[#F4F8FC]"
            >
              Back to teams
            </Link>
          </div>
        </div>

        {err ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#0A2E5C]">
          Team and reason
        </h2>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[#0A2E5C]">
              Team
            </label>
            <select
              className="mt-1 w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#2EA3FF] focus:ring-2 focus:ring-[#8FC8FF]"
              value={selectedTeamId}
              onChange={(e) => handleTeamChange(e.target.value)}
              disabled={teams.length === 0}
            >
              <option value="">Select team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>

            {selectedTeam ? (
              <div className="mt-3 rounded-xl border border-[#D9E2EC] bg-[#F9FBFD] p-4 text-sm text-[#4B5563]">
                Selected team:{" "}
                <span className="font-medium text-[#111827]">
                  {selectedTeam.name}
                </span>
              </div>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0A2E5C]">
              Reason for change
            </label>
            <textarea
              className="mt-1 min-h-[120px] w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#2EA3FF] focus:ring-2 focus:ring-[#8FC8FF]"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why team composition must be changed"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#0A2E5C]">
          Current team composition
        </h2>

        <div className="mt-4 space-y-3">
          {currentMembers.length === 0 ? (
            <div className="rounded-xl border border-[#D9E2EC] bg-[#F9FBFD] px-4 py-6 text-sm text-[#4B5563]">
              No current members in this team.
            </div>
          ) : (
            currentMembers.map((member) => (
              <div
                key={member.id}
                className="rounded-xl border border-[#D9E2EC] bg-[#F9FBFD] p-4"
              >
                <div className="text-sm font-semibold text-[#111827]">
                  {member.full_name}
                </div>
                <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-sm text-[#4B5563]">
                  <div>
                    <span className="font-medium text-[#111827]">Role:</span>{" "}
                    {member.role_title || "—"}
                  </div>
                  <div>
                    <span className="font-medium text-[#111827]">Phone:</span>{" "}
                    {member.phone || "—"}
                  </div>
                  <div>
                    <span className="font-medium text-[#111827]">Email:</span>{" "}
                    {member.email || "—"}
                  </div>
                  <div>
                    <span className="font-medium text-[#111827]">DOB:</span>{" "}
                    {member.date_of_birth || "—"}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0A2E5C]">
              Proposed composition
            </h2>
            <p className="mt-1 text-sm text-[#4B5563]">
              Enter the desired updated team composition.
            </p>
          </div>

          <button
            type="button"
            onClick={addMemberRow}
            className="inline-flex items-center justify-center rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-semibold text-[#0A2E5C] transition hover:bg-[#F4F8FC]"
          >
            Add member row
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {proposedMembers.map((member, index) => (
            <div
              key={index}
              className="rounded-xl border border-[#D9E2EC] bg-[#F9FBFD] p-4"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-[#111827]">
                  Proposed member #{index + 1}
                </div>

                {proposedMembers.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeMemberRow(index)}
                    className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
                  >
                    Remove
                  </button>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-[#0A2E5C]">
                    Full name
                  </label>
                  <input
                    className="mt-1 w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#2EA3FF] focus:ring-2 focus:ring-[#8FC8FF]"
                    value={member.full_name}
                    onChange={(e) =>
                      updateProposedMember(index, "full_name", e.target.value)
                    }
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0A2E5C]">
                    Role
                  </label>
                  <input
                    className="mt-1 w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#2EA3FF] focus:ring-2 focus:ring-[#8FC8FF]"
                    value={member.role_title}
                    onChange={(e) =>
                      updateProposedMember(index, "role_title", e.target.value)
                    }
                    placeholder="Role title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0A2E5C]">
                    Phone
                  </label>
                  <input
                    className="mt-1 w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#2EA3FF] focus:ring-2 focus:ring-[#8FC8FF]"
                    value={member.phone}
                    onChange={(e) =>
                      updateProposedMember(index, "phone", e.target.value)
                    }
                    placeholder="Phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0A2E5C]">
                    Email
                  </label>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#2EA3FF] focus:ring-2 focus:ring-[#8FC8FF]"
                    value={member.email}
                    onChange={(e) =>
                      updateProposedMember(index, "email", e.target.value)
                    }
                    placeholder="Email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0A2E5C]">
                    Date of birth
                  </label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#2EA3FF] focus:ring-2 focus:ring-[#8FC8FF]"
                    value={member.date_of_birth}
                    onChange={(e) =>
                      updateProposedMember(
                        index,
                        "date_of_birth",
                        e.target.value
                      )
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-[#0A2E5C]">
          Admin will review this request before any team composition changes are
          approved.
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSubmitRequest}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-xl bg-[#2EA3FF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Submit request
          </button>

          <Link
            href="/contractor/teams"
            className="inline-flex items-center justify-center rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-semibold text-[#0A2E5C] transition hover:bg-[#F4F8FC]"
          >
            Cancel
          </Link>
        </div>
      </section>
    </main>
  );
}