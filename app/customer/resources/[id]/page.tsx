"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { getMyProfile } from "../../../../lib/profile";

type ResourceRow = {
  id: string;
  customer_id: string;
  title: string;
  description: string | null;
  category: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  revision_label: string | null;
  effective_date: string | null;
  expires_at: string | null;
  is_required: boolean;
  is_active: boolean;
  audience_scope: "all_markets" | "selected_markets";
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type ResourceMarketRow = {
  id: string;
  resource_id: string;
  market: string;
};

type ResourceEventRow = {
  id: string;
  contractor_company_id: string;
  actor_user_id: string | null;
  event_type: "view" | "download" | "acknowledged";
  created_at: string;
};

type AckRow = {
  id: string;
  contractor_company_id: string;
  acknowledged_by: string | null;
  acknowledged_at: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
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
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${styles}`}>
      {children}
    </span>
  );
}

export default function CustomerResourceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const resourceId = String(params.id);

  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [resource, setResource] = useState<ResourceRow | null>(null);
  const [markets, setMarkets] = useState<ResourceMarketRow[]>([]);
  const [events, setEvents] = useState<ResourceEventRow[]>([]);
  const [acks, setAcks] = useState<AckRow[]>([]);

  async function openResource() {
    if (!resource) return;

    setErr(null);
    setOpening(true);

    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Not logged in.");

      const res = await fetch(
        `/api/customer/resources/file-url?resourceId=${encodeURIComponent(resource.id)}`,
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

      window.open(json.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setErr(e.message ?? "Open error");
    } finally {
      setOpening(false);
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

      const { data: resourceRow, error: resourceErr } = await supabase
        .from("customer_resources")
        .select("*")
        .eq("id", resourceId)
        .eq("customer_id", customerRow.id)
        .single();

      if (resourceErr) throw resourceErr;

      const [{ data: marketRows, error: marketErr }, { data: eventRows, error: eventErr }, { data: ackRows, error: ackErr }] =
        await Promise.all([
          supabase
            .from("customer_resource_markets")
            .select("id, resource_id, market")
            .eq("resource_id", resourceId)
            .order("market", { ascending: true }),
          supabase
            .from("customer_resource_events")
            .select("id, contractor_company_id, actor_user_id, event_type, created_at")
            .eq("resource_id", resourceId)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("customer_resource_acknowledgements")
            .select("id, contractor_company_id, acknowledged_by, acknowledged_at")
            .eq("resource_id", resourceId)
            .order("acknowledged_at", { ascending: false }),
        ]);

      if (marketErr) throw marketErr;
      if (eventErr) throw eventErr;
      if (ackErr) throw ackErr;

      setResource(resourceRow as ResourceRow);
      setMarkets((marketRows ?? []) as ResourceMarketRow[]);
      setEvents((eventRows ?? []) as ResourceEventRow[]);
      setAcks((ackRows ?? []) as AckRow[]);
    } catch (e: any) {
      setErr(e.message ?? "Load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceId]);

  const eventSummary = useMemo(() => {
    let views = 0;
    let downloads = 0;
    let acknowledgements = 0;

    for (const row of events) {
      if (row.event_type === "view") views += 1;
      if (row.event_type === "download") downloads += 1;
      if (row.event_type === "acknowledged") acknowledgements += 1;
    }

    return { views, downloads, acknowledgements };
  }, [events]);

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading resource...</p>
        </section>
      </main>
    );
  }

  if (!resource) {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <p className="text-sm text-red-700">Resource not found.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight text-[#0A2E5C]">
                {resource.title}
              </h1>
              <Badge tone="info">{resource.category}</Badge>
              <Badge tone={resource.is_active ? "success" : "neutral"}>
                {resource.is_active ? "active" : "archived"}
              </Badge>
              {resource.is_required ? <Badge tone="warning">required</Badge> : null}
            </div>

            {resource.description ? (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#4B5563]">
                {resource.description}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openResource}
              disabled={opening}
              className="rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {opening ? "Opening..." : "Open File"}
            </button>

            <Link
              href={`/customer/resources/${resource.id}/edit`}
              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              Edit
            </Link>

            <Link
              href="/customer/resources"
              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              Back
            </Link>
          </div>
        </div>
      </section>

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
          <div className="text-sm text-[#4B5563]">Views</div>
          <div className="mt-2 text-2xl font-semibold text-[#111827]">{eventSummary.views}</div>
        </div>

        <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
          <div className="text-sm text-[#4B5563]">Downloads</div>
          <div className="mt-2 text-2xl font-semibold text-[#111827]">{eventSummary.downloads}</div>
        </div>

        <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
          <div className="text-sm text-[#4B5563]">Acknowledgements</div>
          <div className="mt-2 text-2xl font-semibold text-[#111827]">{acks.length}</div>
        </div>

        <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
          <div className="text-sm text-[#4B5563]">Updated</div>
          <div className="mt-2 text-sm font-semibold text-[#111827]">
            {formatDateTime(resource.updated_at)}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">Resource Details</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">File</div>
              <div className="mt-1 text-sm font-medium text-[#111827]">{resource.file_name}</div>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Revision</div>
              <div className="mt-1 text-sm font-medium text-[#111827]">
                {resource.revision_label || "—"}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Effective date</div>
              <div className="mt-1 text-sm font-medium text-[#111827]">
                {formatDate(resource.effective_date)}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Expiration date</div>
              <div className="mt-1 text-sm font-medium text-[#111827]">
                {formatDate(resource.expires_at)}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Audience</div>
              <div className="mt-1 text-sm font-medium text-[#111827]">
                {resource.audience_scope === "all_markets" ? "All markets" : "Selected markets"}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Required acknowledgement</div>
              <div className="mt-1 text-sm font-medium text-[#111827]">
                {resource.is_required ? "Yes" : "No"}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">Market Scope</h2>

          {resource.audience_scope === "all_markets" ? (
            <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#111827]">
              Available in all markets.
            </div>
          ) : markets.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
              No markets linked.
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {markets.map((row) => (
                <Badge key={row.id} tone="info">
                  {row.market}
                </Badge>
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">Acknowledgements</h2>

          {acks.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
              No acknowledgements yet.
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {acks.map((row) => (
                <div
                  key={row.id}
                  className="rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-4"
                >
                  <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                    Contractor company
                  </div>
                  <div className="mt-1 text-sm font-medium text-[#111827]">
                    {row.contractor_company_id}
                  </div>
                  <div className="mt-2 text-xs text-[#6B7280]">
                    Acknowledged: {formatDateTime(row.acknowledged_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">Recent Activity</h2>

          {events.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
              No activity yet.
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {events.map((row) => (
                <div
                  key={row.id}
                  className="rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="info">{row.event_type}</Badge>
                  </div>

                  <div className="mt-2 text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                    Contractor company
                  </div>
                  <div className="mt-1 text-sm font-medium text-[#111827]">
                    {row.contractor_company_id}
                  </div>

                  <div className="mt-2 text-xs text-[#6B7280]">
                    {formatDateTime(row.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}