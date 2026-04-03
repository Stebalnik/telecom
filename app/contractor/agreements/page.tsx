"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { getMyProfile } from "../../../lib/profile";

type AgreementRow = {
  id: string;
  customer_id: string;
  contractor_company_id: string | null;
  job_id: string | null;
  template_id: string | null;
  agreement_type: string | null;
  title: string | null;
  file_name: string | null;
  file_path: string | null;
  status: string | null;
  source: string | null;
  created_at: string;
  updated_at?: string | null;
  signed_at?: string | null;
  effective_date?: string | null;
  expiration_date?: string | null;
  customer:
    | {
        id: string;
        legal_name: string | null;
        dba_name: string | null;
        name?: string | null;
      }
    | {
        id: string;
        legal_name: string | null;
        dba_name: string | null;
        name?: string | null;
      }[]
    | null;
};

type AgreementFilter = "all" | "pending" | "signed" | "active";

function normalizeCustomer(
  value:
    | {
        id: string;
        legal_name: string | null;
        dba_name: string | null;
        name?: string | null;
      }
    | {
        id: string;
        legal_name: string | null;
        dba_name: string | null;
        name?: string | null;
      }[]
    | null
) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function StatusBadge({ status }: { status: string }) {
  const normalized = (status || "unknown").toLowerCase();

  const styles =
    normalized === "signed" || normalized === "active"
      ? "border-green-200 bg-green-50 text-green-700"
      : normalized === "awaiting_signature" || normalized === "sent" || normalized === "pending"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-[#D9E2EC] bg-[#F8FAFC] text-[#4B5563]";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${styles}`}
    >
      {normalized.replaceAll("_", " ")}
    </span>
  );
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-[#1F6FB5] text-white"
          : "border border-[#D9E2EC] bg-white text-[#111827] hover:bg-[#F8FAFC]"
      }`}
    >
      {children}
    </button>
  );
}

export default function ContractorAgreementsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<AgreementFilter>("all");
  const [agreements, setAgreements] = useState<AgreementRow[]>([]);

  async function openAgreement(agreementId: string) {
    setErr(null);
    setOpeningId(agreementId);

    try {
      const agreement = agreements.find((row) => row.id === agreementId);
      if (!agreement?.file_path) {
        throw new Error("Agreement file is not attached.");
      }

      const { data, error } = await supabase.storage
        .from("customer-agreements")
        .createSignedUrl(agreement.file_path, 60 * 20);

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || "Failed to open agreement file.");
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setErr(e.message ?? "Open error");
    } finally {
      setOpeningId(null);
    }
  }

  async function loadPage() {
    setLoading(true);
    setErr(null);

    try {
      const profile = await getMyProfile();

      if (!profile) {
        router.replace("/login");
        return;
      }

      if (profile.role !== "contractor") {
        router.replace("/dashboard");
        return;
      }

      const { data: companyRow, error: companyErr } = await supabase
        .from("contractor_companies")
        .select("id")
        .eq("owner_user_id", profile.id)
        .single();

      if (companyErr) throw companyErr;

      const { data, error } = await supabase
        .from("customer_agreements")
        .select(`
          id,
          customer_id,
          contractor_company_id,
          job_id,
          template_id,
          agreement_type,
          title,
          file_name,
          file_path,
          status,
          source,
          created_at,
          updated_at,
          signed_at,
          effective_date,
          expiration_date,
          customer:customers (
            id,
            legal_name,
            dba_name,
            name
          )
        `)
        .eq("contractor_company_id", companyRow.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setAgreements((data ?? []) as AgreementRow[]);
    } catch (e: any) {
      setErr(e.message ?? "Load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();

    let reloadTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        loadPage();
      }, 300);
    };

    const agreementsChannel = supabase
      .channel("contractor-agreements-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customer_agreements" },
        () => scheduleReload()
      )
      .subscribe();

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      supabase.removeChannel(agreementsChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const pending = agreements.filter((row) =>
      ["sent", "awaiting_signature", "pending"].includes((row.status || "").toLowerCase())
    ).length;

    const signed = agreements.filter(
      (row) => (row.status || "").toLowerCase() === "signed"
    ).length;

    const active = agreements.filter(
      (row) => (row.status || "").toLowerCase() === "active"
    ).length;

    return {
      total: agreements.length,
      pending,
      signed,
      active,
    };
  }, [agreements]);

  const filtered = useMemo(() => {
    return agreements.filter((row) => {
      const status = (row.status || "").toLowerCase();

      if (filter === "pending") {
        return ["sent", "awaiting_signature", "pending"].includes(status);
      }

      if (filter === "signed") {
        return status === "signed";
      }

      if (filter === "active") {
        return status === "active";
      }

      return true;
    });
  }, [agreements, filter]);

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#0A2E5C]">
              Agreements
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
              Review pending, signed, and active agreements assigned to your contractor company.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
            <div className="text-sm text-[#4B5563]">Total</div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {counts.total}
            </div>
          </div>

          <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
            <div className="text-sm text-[#4B5563]">Pending</div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {counts.pending}
            </div>
          </div>

          <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
            <div className="text-sm text-[#4B5563]">Signed</div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {counts.signed}
            </div>
          </div>

          <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
            <div className="text-sm text-[#4B5563]">Active</div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {counts.active}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
            All ({counts.total})
          </FilterButton>
          <FilterButton active={filter === "pending"} onClick={() => setFilter("pending")}>
            Pending ({counts.pending})
          </FilterButton>
          <FilterButton active={filter === "signed"} onClick={() => setFilter("signed")}>
            Signed ({counts.signed})
          </FilterButton>
          <FilterButton active={filter === "active"} onClick={() => setFilter("active")}>
            Active ({counts.active})
          </FilterButton>
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading agreements...</p>
        </section>
      ) : null}

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      {!loading && !err && filtered.length === 0 ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">No agreements found.</p>
        </section>
      ) : null}

      {!loading && !err && filtered.length > 0 ? (
        <section className="grid gap-4">
          {filtered.map((row) => {
            const customer = normalizeCustomer(row.customer);
            const customerName =
              customer?.dba_name ||
              customer?.legal_name ||
              customer?.name ||
              "Customer";

            return (
              <article
                key={row.id}
                className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-[#111827]">
                        {row.title || row.file_name || "Agreement"}
                      </h2>
                      <StatusBadge status={row.status || "unknown"} />
                    </div>

                    <div className="mt-2 text-sm text-[#4B5563]">
                      Customer: <span className="font-medium text-[#111827]">{customerName}</span>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                          Type
                        </div>
                        <div className="mt-1 text-sm font-medium text-[#111827]">
                          {row.agreement_type || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                          File
                        </div>
                        <div className="mt-1 text-sm font-medium text-[#111827]">
                          {row.file_name || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                          Created
                        </div>
                        <div className="mt-1 text-sm font-medium text-[#111827]">
                          {formatDate(row.created_at)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                          Signed
                        </div>
                        <div className="mt-1 text-sm font-medium text-[#111827]">
                          {formatDate(row.signed_at)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                          Effective / Expiration
                        </div>
                        <div className="mt-1 text-sm font-medium text-[#111827]">
                          {formatDate(row.effective_date)} / {formatDate(row.expiration_date)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openAgreement(row.id)}
                      disabled={openingId === row.id}
                      className="rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {openingId === row.id ? "Opening..." : "Open"}
                    </button>

                    <Link
                      href="/contractor/customers"
                      className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                    >
                      Customers
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </main>
  );
}