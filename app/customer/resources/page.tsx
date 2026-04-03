"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile } from "../../../lib/profile";
import { supabase } from "../../../lib/supabaseClient";

type ResourceRow = {
  id: string;
  customer_id: string;
  title: string;
  description: string | null;
  category: string;
  file_name: string;
  revision_label: string | null;
  effective_date: string | null;
  expires_at: string | null;
  is_required: boolean;
  is_active: boolean;
  audience_scope: "all_markets" | "selected_markets";
  created_at: string;
  updated_at: string;
};

type ResourceMarketRow = {
  resource_id: string;
  market: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "info";
}) {
  const styles =
    tone === "success"
      ? "border-green-200 bg-green-50 text-green-700"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "info"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-[#D9E2EC] bg-[#F8FAFC] text-[#4B5563]";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${styles}`}
    >
      {children}
    </span>
  );
}

export default function CustomerResourcesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [resourceMarkets, setResourceMarkets] = useState<ResourceMarketRow[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [openingId, setOpeningId] = useState<string | null>(null);

  async function openResource(resourceId: string) {
    setErr(null);
    setOpeningId(resourceId);

    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Not logged in.");

      const res = await fetch(
        `/api/customer/resources/file-url?resourceId=${encodeURIComponent(resourceId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to open resource.");
      }

      if (!json?.url) {
        throw new Error("Signed URL was not returned.");
      }

      window.open(json.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setErr(e.message ?? "Open error");
    } finally {
      setOpeningId(null);
    }
  }

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

      const { data: customerRow, error: customerErr } = await supabase
        .from("customers")
        .select("id")
        .eq("owner_user_id", profile.id)
        .single();

      if (customerErr) throw customerErr;

      const { data: resourceRows, error: resourceErr } = await supabase
        .from("customer_resources")
        .select("*")
        .eq("customer_id", customerRow.id)
        .order("created_at", { ascending: false });

      if (resourceErr) throw resourceErr;

      const ids = (resourceRows ?? []).map((r) => r.id);

      if (ids.length === 0) {
        setResources([]);
        setResourceMarkets([]);
        return;
      }

      const { data: marketRows, error: marketErr } = await supabase
        .from("customer_resource_markets")
        .select("resource_id, market")
        .in("resource_id", ids);

      if (marketErr) throw marketErr;

      setResources((resourceRows ?? []) as ResourceRow[]);
      setResourceMarkets((marketRows ?? []) as ResourceMarketRow[]);
    } catch (e: any) {
      setErr(e.message ?? "Load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    let reloadTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        load();
      }, 300);
    };

    const resourcesChannel = supabase
      .channel("customer-resources-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customer_resources" },
        () => scheduleReload()
      )
      .subscribe();

    const marketsChannel = supabase
      .channel("customer-resource-markets-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customer_resource_markets" },
        () => scheduleReload()
      )
      .subscribe();

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      supabase.removeChannel(resourcesChannel);
      supabase.removeChannel(marketsChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return resources.filter((row) => {
      const q = query.trim().toLowerCase();

      const matchesQuery =
        !q ||
        row.title.toLowerCase().includes(q) ||
        (row.description || "").toLowerCase().includes(q) ||
        row.file_name.toLowerCase().includes(q);

      const matchesCategory = category === "all" || row.category === category;

      return matchesQuery && matchesCategory;
    });
  }, [resources, query, category]);

  const marketsByResource = useMemo(() => {
    const map = new Map<string, string[]>();

    for (const row of resourceMarkets) {
      const current = map.get(row.resource_id) ?? [];
      current.push(row.market);
      map.set(row.resource_id, current);
    }

    return map;
  }, [resourceMarkets]);

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#0A2E5C]">
              Contractor Resources
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
              Upload standards, SOPs, training files, safety notes, and work instructions
              available to your approved contractors.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/customer/resources/new"
              className="rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
            >
              Upload Resource
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_220px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, description, or file name"
            className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
          >
            <option value="all">All categories</option>
            <option value="standard">Standard</option>
            <option value="sop">SOP</option>
            <option value="mop">MOP</option>
            <option value="training">Training</option>
            <option value="safety">Safety</option>
            <option value="closeout">Closeout</option>
            <option value="diagram">Diagram</option>
            <option value="template">Template</option>
            <option value="other">Other</option>
          </select>
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading resources...</p>
        </section>
      ) : null}

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <p className="text-sm text-red-700">{err}</p>
        </section>
      ) : null}

      {!loading && !err && filtered.length === 0 ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">
            No resources found yet. Upload your first contractor resource.
          </p>
        </section>
      ) : null}

      {!loading && !err && filtered.length > 0 ? (
        <section className="grid gap-4">
          {filtered.map((row) => {
            const markets = marketsByResource.get(row.id) ?? [];

            return (
              <article
                key={row.id}
                className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-[#111827]">{row.title}</h2>
                      <Badge tone="info">{row.category}</Badge>
                      <Badge tone={row.is_active ? "success" : "neutral"}>
                        {row.is_active ? "active" : "archived"}
                      </Badge>
                      {row.is_required ? <Badge tone="warning">required</Badge> : null}
                    </div>

                    {row.description ? (
                      <p className="mt-2 text-sm leading-6 text-[#4B5563]">
                        {row.description}
                      </p>
                    ) : null}

                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                          File
                        </div>
                        <div className="mt-1 text-sm font-medium text-[#111827]">
                          {row.file_name}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                          Revision
                        </div>
                        <div className="mt-1 text-sm font-medium text-[#111827]">
                          {row.revision_label || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                          Effective date
                        </div>
                        <div className="mt-1 text-sm font-medium text-[#111827]">
                          {formatDate(row.effective_date)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                          Market scope
                        </div>
                        <div className="mt-1 text-sm font-medium text-[#111827]">
                          {row.audience_scope === "all_markets"
                            ? "All markets"
                            : markets.length > 0
                            ? markets.join(", ")
                            : "Selected markets"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                          Updated
                        </div>
                        <div className="mt-1 text-sm font-medium text-[#111827]">
                          {formatDate(row.updated_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openResource(row.id)}
                      disabled={openingId === row.id}
                      className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {openingId === row.id ? "Opening..." : "Open"}
                    </button>

                    <Link
                      href={`/customer/resources/${row.id}/edit`}
                      className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                    >
                      Edit
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