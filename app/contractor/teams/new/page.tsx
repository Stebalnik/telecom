"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { getMyProfile } from "../../../../lib/profile";
import {
  createMember,
  createTeam,
  getMyCompany,
  type Company,
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

export default function ContractorNewTeamPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [company, setCompany] = useState<Company | null>(null);
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<DraftMember[]>([emptyMember()]);

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
      } catch (e: any) {
        setErr(e?.message || "Failed to load new team page.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  function updateMember(
    index: number,
    field: keyof DraftMember,
    value: string
  ) {
    setMembers((prev) =>
      prev.map((member, i) =>
        i === index ? { ...member, [field]: value } : member
      )
    );
  }

  function addMemberRow() {
    setMembers((prev) => [...prev, emptyMember()]);
  }

  function removeMemberRow(index: number) {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreateTeam() {
    try {
      setErr(null);

      if (!company) {
        setErr("Company is required.");
        return;
      }

      if (!teamName.trim()) {
        setErr("Team name is required.");
        return;
      }

      const validMembers = members.filter((member) => member.full_name.trim());

      if (validMembers.length === 0) {
        setErr("Add at least one team member.");
        return;
      }

      setSaving(true);

      const team = await createTeam(company.id, teamName.trim());

      for (const member of validMembers) {
        await createMember({
          teamId: team.id,
          fullName: member.full_name.trim(),
          roleTitle: member.role_title.trim(),
          phone: member.phone.trim(),
          email: member.email.trim().toLowerCase(),
          dateOfBirth: member.date_of_birth,
        });
      }

      router.push("/contractor/teams");
    } catch (e: any) {
      setErr(e?.message || "Failed to create team.");
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
                Create team
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
              Create team
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
              Enter the team name and the initial team members. After the team is
              created, team composition changes should be requested through
              admin with a reason for the change.
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
        <h2 className="text-lg font-semibold text-[#0A2E5C]">Team details</h2>

        <div className="mt-4 max-w-xl">
          <label className="block text-sm font-medium text-[#0A2E5C]">
            Team name
          </label>
          <input
            className="mt-1 w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#2EA3FF] focus:ring-2 focus:ring-[#8FC8FF]"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Enter team name"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0A2E5C]">
              Team members
            </h2>
            <p className="mt-1 text-sm text-[#4B5563]">
              Add the initial members for this team.
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
          {members.map((member, index) => (
            <div
              key={index}
              className="rounded-xl border border-[#D9E2EC] bg-[#F9FBFD] p-4"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-[#111827]">
                  Member #{index + 1}
                </div>

                {members.length > 1 ? (
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
                      updateMember(index, "full_name", e.target.value)
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
                      updateMember(index, "role_title", e.target.value)
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
                      updateMember(index, "phone", e.target.value)
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
                      updateMember(index, "email", e.target.value)
                    }
                    placeholder="Email address"
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
                      updateMember(index, "date_of_birth", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-[#0A2E5C]">
          After the team is created, composition changes should be submitted as
          an admin request with a reason for the change.
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={handleCreateTeam}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-xl bg-[#2EA3FF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Confirm and create team
          </button>
        </div>
      </section>
    </main>
  );
}