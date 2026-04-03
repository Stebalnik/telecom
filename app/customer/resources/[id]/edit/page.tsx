"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabaseClient";
import { getMyProfile } from "../../../../../lib/profile";

type Category =
  | "standard"
  | "sop"
  | "mop"
  | "training"
  | "safety"
  | "closeout"
  | "diagram"
  | "template"
  | "other";

type AudienceScope = "all_markets" | "selected_markets";

type ResourceRow = {
  id: string;
  customer_id: string;
  title: string;
  description: string | null;
  category: Category;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  revision_label: string | null;
  effective_date: string | null;
  expires_at: string | null;
  is_required: boolean;
  is_active: boolean;
  audience_scope: AudienceScope;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type ResourceMarketRow = {
  id: string;
  resource_id: string;
  market: string;
};

const categoryOptions: Category[] = [
  "standard",
  "sop",
  "mop",
  "training",
  "safety",
  "closeout",
  "diagram",
  "template",
  "other",
];

const marketOptions = [
  "FL",
  "GA",
  "NC",
  "SC",
  "TN",
  "AL",
  "KY",
  "OH",
  "IL",
  "KS",
  "NE",
  "CO",
  "WY",
];

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function CustomerResourceEditPage() {
  const params = useParams();
  const router = useRouter();
  const resourceId = String(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [opening, setOpening] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [resource, setResource] = useState<ResourceRow | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("standard");
  const [revisionLabel, setRevisionLabel] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [audienceScope, setAudienceScope] = useState<AudienceScope>("all_markets");
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (audienceScope === "selected_markets" && selectedMarkets.length === 0) {
      return false;
    }
    return true;
  }, [title, audienceScope, selectedMarkets]);

  function toggleMarket(market: string) {
    setSelectedMarkets((prev) =>
      prev.includes(market) ? prev.filter((m) => m !== market) : [...prev, market]
    );
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

      const { data: marketRows, error: marketErr } = await supabase
        .from("customer_resource_markets")
        .select("id, resource_id, market")
        .eq("resource_id", resourceId);

      if (marketErr) throw marketErr;

      const row = resourceRow as ResourceRow;
      const markets = ((marketRows ?? []) as ResourceMarketRow[]).map((m) => m.market);

      setResource(row);
      setTitle(row.title);
      setDescription(row.description || "");
      setCategory(row.category);
      setRevisionLabel(row.revision_label || "");
      setEffectiveDate(row.effective_date || "");
      setExpiresAt(row.expires_at || "");
      setIsRequired(row.is_required);
      setIsActive(row.is_active);
      setAudienceScope(row.audience_scope);
      setSelectedMarkets(markets);
      setSelectedFile(null);
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

  async function openCurrentFile() {
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

      if (!json?.url) {
        throw new Error("Signed URL was not returned.");
      }

      window.open(json.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setErr(e.message ?? "Open error");
    } finally {
      setOpening(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!resource) return;
    if (!title.trim()) {
      setErr("Title is required.");
      return;
    }
    if (audienceScope === "selected_markets" && selectedMarkets.length === 0) {
      setErr("Select at least one market.");
      return;
    }

    setSaving(true);

    try {
      const profile = await getMyProfile();
      if (!profile || profile.role !== "customer") {
        throw new Error("Customer profile required.");
      }

      let nextFilePath = resource.file_path;
      let nextFileName = resource.file_name;
      let nextMimeType = resource.mime_type;
      let nextFileSize = resource.file_size_bytes;

      if (selectedFile) {
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) throw sessionErr;

        const accessToken = sessionData.session?.access_token;
        if (!accessToken) throw new Error("Not logged in.");

        const uploadRes = await fetch("/api/customer/resources/upload-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            fileName: selectedFile.name,
            contentType: selectedFile.type || "application/octet-stream",
          }),
        });

        const uploadJson = await uploadRes.json();

        if (!uploadRes.ok) {
          throw new Error(uploadJson?.error || "Failed to prepare upload.");
        }

        const uploadFileRes = await fetch(uploadJson.signedUrl as string, {
          method: "PUT",
          headers: {
            "Content-Type": selectedFile.type || "application/octet-stream",
          },
          body: selectedFile,
        });

        if (!uploadFileRes.ok) {
          throw new Error("Failed to upload replacement file.");
        }

        nextFilePath = uploadJson.path;
        nextFileName = selectedFile.name;
        nextMimeType = selectedFile.type || null;
        nextFileSize = selectedFile.size;

        if (resource.file_path && resource.file_path !== nextFilePath) {
          await supabase.storage.from("customer-resources").remove([resource.file_path]);
        }
      }

      const { error: updateErr } = await supabase
        .from("customer_resources")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          category,
          file_name: nextFileName,
          file_path: nextFilePath,
          mime_type: nextMimeType,
          file_size_bytes: nextFileSize,
          revision_label: revisionLabel.trim() || null,
          effective_date: effectiveDate || null,
          expires_at: expiresAt || null,
          is_required: isRequired,
          is_active: isActive,
          audience_scope: audienceScope,
        })
        .eq("id", resource.id);

      if (updateErr) throw updateErr;

      const { error: deleteMarketsErr } = await supabase
        .from("customer_resource_markets")
        .delete()
        .eq("resource_id", resource.id);

      if (deleteMarketsErr) throw deleteMarketsErr;

      if (audienceScope === "selected_markets" && selectedMarkets.length > 0) {
        const payload = selectedMarkets.map((market) => ({
          resource_id: resource.id,
          market,
        }));

        const { error: insertMarketsErr } = await supabase
          .from("customer_resource_markets")
          .insert(payload);

        if (insertMarketsErr) throw insertMarketsErr;
      }

      router.push(`/customer/resources/${resource.id}`);
    } catch (e: any) {
      setErr(e.message ?? "Update resource error");
    } finally {
      setSaving(false);
    }
  }

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
            <h1 className="text-3xl font-semibold tracking-tight text-[#0A2E5C]">
              Edit Resource
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
              Update contractor-facing standards, training materials, and work
              instructions.
            </p>
            <p className="mt-2 text-xs text-[#6B7280]">
              Created: {formatDateTime(resource.created_at)} · Updated:{" "}
              {formatDateTime(resource.updated_at)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openCurrentFile}
              disabled={opening}
              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {opening ? "Opening..." : "Open Current File"}
            </button>

            <Link
              href={`/customer/resources/${resource.id}`}
              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              Back to Resource
            </Link>
          </div>
        </div>
      </section>

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">Resource Details</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#111827]">
                Title *
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="AT&T closeout standard v3"
                className="mt-2 w-full rounded-xl border border-[#D9E2EC] px-4 py-3 text-sm outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#111827]">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short note describing where and when contractors should use this material."
                className="mt-2 min-h-[120px] w-full rounded-xl border border-[#D9E2EC] px-4 py-3 text-sm outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827]">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="mt-2 w-full rounded-xl border border-[#D9E2EC] px-4 py-3 text-sm outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              >
                {categoryOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827]">
                Revision
              </label>
              <input
                value={revisionLabel}
                onChange={(e) => setRevisionLabel(e.target.value)}
                placeholder="v1.0"
                className="mt-2 w-full rounded-xl border border-[#D9E2EC] px-4 py-3 text-sm outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827]">
                Effective date
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#D9E2EC] px-4 py-3 text-sm outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827]">
                Expiration date
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#D9E2EC] px-4 py-3 text-sm outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#111827]">
                Replace file
              </label>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                className="mt-2 block w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827]"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt"
              />
              <p className="mt-2 text-xs text-[#6B7280]">
                Current file: {resource.file_name}
              </p>
              {selectedFile ? (
                <p className="mt-1 text-xs text-[#6B7280]">
                  New file: {selectedFile.name} · {Math.round(selectedFile.size / 1024)} KB
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">Visibility</h2>

          <div className="mt-4 space-y-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-[#D9E2EC]"
              />
              <span className="text-sm text-[#111827]">
                Require acknowledgement from contractors
              </span>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-[#D9E2EC]"
              />
              <span className="text-sm text-[#111827]">
                Resource is active and visible according to access rules
              </span>
            </label>

            <div>
              <label className="block text-sm font-medium text-[#111827]">
                Market scope
              </label>

              <div className="mt-3 flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm text-[#111827]">
                  <input
                    type="radio"
                    name="audienceScope"
                    checked={audienceScope === "all_markets"}
                    onChange={() => setAudienceScope("all_markets")}
                  />
                  All markets
                </label>

                <label className="flex items-center gap-2 text-sm text-[#111827]">
                  <input
                    type="radio"
                    name="audienceScope"
                    checked={audienceScope === "selected_markets"}
                    onChange={() => setAudienceScope("selected_markets")}
                  />
                  Selected markets only
                </label>
              </div>
            </div>

            {audienceScope === "selected_markets" ? (
              <div>
                <div className="text-sm font-medium text-[#111827]">Markets *</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {marketOptions.map((market) => {
                    const active = selectedMarkets.includes(market);

                    return (
                      <button
                        key={market}
                        type="button"
                        onClick={() => toggleMarket(market)}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                          active
                            ? "border-[#1F6FB5] bg-[#EAF4FF] text-[#0A2E5C]"
                            : "border-[#D9E2EC] bg-white text-[#111827] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        {market}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-[#4B5563]">
              Resource remains available only inside your customer workspace and to
              approved contractors who match the assigned markets.
            </div>

            <button
              type="submit"
              disabled={saving || !canSubmit}
              className="inline-flex items-center justify-center rounded-xl bg-[#1F6FB5] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0A2E5C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </section>
      </form>
    </main>
  );
}