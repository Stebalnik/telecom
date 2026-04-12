"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeError } from "../../../lib/errors/normalizeError";
import { withErrorLogging } from "../../../lib/errors/withErrorLogging";

type AppLikeError = Error & {
  code?: string;
  details?: Record<string, unknown>;
};

type InvitationItem = {
  id: string;
  status: string | null;
  message: string | null;
  invited_at: string | null;
  responded_at: string | null;
  contractor_company_id: string | null;
  vacancy_id: string | null;
  team_id: string | null;
  company_name: string | null;
  vacancy_title: string | null;
  target_role: string | null;
};

function getSafeInvitationsErrorMessage(error: unknown, fallback: string) {
  const normalized = normalizeError(error) as AppLikeError;
  const code = String(normalized.code || "");

  if (code.includes("not_logged_in")) {
    return "Your session has expired. Please log in again.";
  }

  return fallback;
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString();
}

function formatInvitationStatus(status: string | null) {
  const value = String(status || "").toLowerCase();

  if (value === "pending") return "Pending";
  if (value === "accepted") return "Accepted";
  if (value === "declined") return "Declined";
  return "Unknown";
}

function getInvitationBadgeClass(status: string | null) {
  const value = String(status || "").toLowerCase();

  if (value === "accepted") {
    return "border border-green-200 bg-green-50 text-green-700";
  }

  if (value === "declined") {
    return "border border-red-200 bg-red-50 text-red-700";
  }

  if (value === "pending") {
    return "border border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border border-[#D9E2EC] bg-[#F8FBFF] text-[#4B5563]";
}

export default function WorkerInvitationsPage() {
  const [items, setItems] = useState<InvitationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadInvitations() {
      setLoading(true);
      setErr(null);
      setMessage(null);

      try {
        const rows = await withErrorLogging(
          async () => {
            const res = await fetch("/api/worker/invitations", {
              method: "GET",
              cache: "no-store",
            });

            const json = await res.json();

            if (!res.ok) {
              throw new Error(json?.error || "Unable to load invitations");
            }

            return (json?.invitations ?? []) as InvitationItem[];
          },
          {
            message: "specialist_invitations_load_failed",
            code: "specialist_invitations_load_failed",
            source: "frontend",
            area: "worker_invitations",
            role: "specialist",
            path: "/worker/invitations",
          }
        );

        if (!mounted) return;

        setItems(rows);
      } catch (error) {
        if (!mounted) return;
        setErr(
          getSafeInvitationsErrorMessage(
            error,
            "Unable to load invitations. Please refresh and try again."
          )
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadInvitations();

    return () => {
      mounted = false;
    };
  }, []);

  const statusOptions = useMemo(() => {
    return Array.from(
      new Set(items.map((item) => item.status).filter(Boolean) as string[])
    ).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesStatus =
        statusFilter === "" || item.status === statusFilter;

      const matchesQuery =
        normalizedQuery === "" ||
        [
          item.company_name,
          item.vacancy_title,
          item.target_role,
          item.message,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedQuery)
          );

      return matchesStatus && matchesQuery;
    });
  }, [items, query, statusFilter]);

  async function handleResponse(
    invitationId: string,
    responseStatus: "accepted" | "declined"
  ) {
    setActioningId(invitationId);
    setErr(null);
    setMessage(null);

    try {
      const result = await withErrorLogging(
        async () => {
          const res = await fetch("/api/worker/invitations", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              invitationId,
              status: responseStatus,
            }),
          });

          const json = await res.json();

          if (!res.ok) {
            throw new Error(json?.error || "Unable to respond to invitation");
          }

          return json as {
            invitation?: {
              status?: string | null;
              responded_at?: string | null;
            };
          };
        },
        {
          message: "specialist_invitation_response_failed",
          code: "specialist_invitation_response_failed",
          source: "frontend",
          area: "worker_invitations",
          role: "specialist",
          path: "/worker/invitations",
          details: {
            invitationId,
            status: responseStatus,
          },
        }
      );

      setItems((prev) =>
        prev.map((item) =>
          item.id === invitationId
            ? {
                ...item,
                status: result.invitation?.status ?? responseStatus,
                responded_at:
                  result.invitation?.responded_at ?? new Date().toISOString(),
              }
            : item
        )
      );

      setMessage(
        responseStatus === "accepted"
          ? "Invitation accepted."
          : "Invitation declined."
      );
    } catch (error) {
      setErr(
        getSafeInvitationsErrorMessage(
          error,
          "Unable to update invitation. Please try again."
        )
      );
    } finally {
      setActioningId(null);
    }
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#0A2E5C]">
          Invitations
        </h1>
        <p className="mt-2 text-sm text-[#4B5563]">
          Review invitations from contractors and choose whether to accept or
          decline them.
        </p>
      </section>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label
              htmlFor="invitations-search"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Search
            </label>
            <input
              id="invitations-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Company, vacancy, role..."
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            />
          </div>

          <div>
            <label
              htmlFor="invitations-status"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Status
            </label>
            <select
              id="invitations-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            >
              <option value="">All statuses</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {formatInvitationStatus(option)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-[#4B5563]">
          {filteredItems.length} invitation
          {filteredItems.length === 1 ? "" : "s"}
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading invitations...</p>
        </section>
      ) : null}

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      {message ? (
        <section className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 shadow-sm">
          {message}
        </section>
      ) : null}

      {!loading ? (
        <section className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-[#D9E2EC] bg-white p-6 text-sm text-[#4B5563] shadow-sm">
              No invitations found for the current filters.
            </div>
          ) : (
            filteredItems.map((item) => {
              const isPending =
                String(item.status || "").toLowerCase() === "pending";
              const isActioning = actioningId === item.id;

              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-[#111827]">
                          {item.vacancy_title || "Invitation"}
                        </h2>

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getInvitationBadgeClass(
                            item.status
                          )}`}
                        >
                          {formatInvitationStatus(item.status)}
                        </span>
                      </div>

                      <div className="mt-2 text-sm text-[#4B5563]">
                        {item.company_name || "Contractor company"}
                      </div>

                      <div className="mt-4 grid gap-3 text-sm text-[#4B5563] sm:grid-cols-2 xl:grid-cols-3">
                        <div>
                          <span className="font-medium text-[#111827]">
                            Role:
                          </span>{" "}
                          {item.target_role || "Not specified"}
                        </div>
                        <div>
                          <span className="font-medium text-[#111827]">
                            Invited:
                          </span>{" "}
                          {formatDate(item.invited_at)}
                        </div>
                        <div>
                          <span className="font-medium text-[#111827]">
                            Responded:
                          </span>{" "}
                          {formatDate(item.responded_at)}
                        </div>
                        <div>
                          <span className="font-medium text-[#111827]">
                            Team link:
                          </span>{" "}
                          {item.team_id ? "Included" : "Not specified"}
                        </div>
                      </div>

                      {item.message ? (
                        <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
                          <div className="text-sm font-medium text-[#111827]">
                            Invitation message
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[#4B5563]">
                            {item.message}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-3">
                      {isPending ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              void handleResponse(item.id, "accepted")
                            }
                            disabled={isActioning}
                            className={`rounded-xl px-4 py-3 text-sm font-medium text-white transition ${
                              isActioning
                                ? "cursor-not-allowed bg-[#9CA3AF]"
                                : "bg-[#1F6FB5] hover:bg-[#0A2E5C]"
                            }`}
                          >
                            {isActioning ? "Updating..." : "Accept"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void handleResponse(item.id, "declined")
                            }
                            disabled={isActioning}
                            className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                              isActioning
                                ? "cursor-not-allowed border border-[#D9E2EC] bg-white text-[#9CA3AF]"
                                : "border border-red-200 bg-white text-red-700 hover:bg-red-50"
                            }`}
                          >
                            Decline
                          </button>
                        </>
                      ) : (
                        <a
                          href="/worker/vacancies"
                          className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                        >
                          Browse vacancies
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      ) : null}
    </main>
  );
}