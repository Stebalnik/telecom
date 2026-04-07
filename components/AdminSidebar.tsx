"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { withErrorLogging } from "../lib/errors/withErrorLogging";

type BadgeKey =
  | "feedback"
  | "errors"
  | "customerApprovals"
  | "contractorApprovals";

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  badgeKey?: BadgeKey;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

type FeedbackSummary = {
  total?: number;
  newCount?: number;
  inReviewCount?: number;
  waitingForUserCount?: number;
  resolvedCount?: number;
  customerCount?: number;
  contractorCount?: number;
  publicCount?: number;
  highPriorityCount?: number;
  attentionCount?: number;
};

type ErrorSummary = {
  total?: number;
  unresolvedCount?: number;
  criticalCount?: number;
  byLevel?: Record<string, number>;
  bySource?: Record<string, number>;
  byArea?: Record<string, number>;
  topFingerprints?: Array<{
    fingerprint: string;
    total: number;
  }>;
};

type PendingCountResponse = {
  count?: number;
};

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Review Center", exact: true }],
  },
  {
    title: "Analytics",
    items: [
      { href: "/admin/analytics", label: "Analytics", exact: true },
      { href: "/admin/analytics/customers", label: "Customer Analytics" },
      { href: "/admin/analytics/contractors", label: "Contractor Analytics" },
      { href: "/admin/analytics/admin-actions", label: "Admin Actions" },
    ],
  },
  {
    title: "Initial Approvals",
    items: [
      {
        href: "/admin/customer-approvals",
        label: "Customer Approvals",
        badgeKey: "customerApprovals",
      },
      {
        href: "/admin/contractor-approvals",
        label: "Contractor Approvals",
        badgeKey: "contractorApprovals",
      },
    ],
  },
  {
    title: "Reviews",
    items: [
      { href: "/admin/company-change-requests", label: "Company Changes" },
      { href: "/admin/team-change-requests", label: "Team Changes" },
    ],
  },
  {
    title: "Support",
    items: [
      { href: "/admin/feedback", label: "Feedback", badgeKey: "feedback" },
      { href: "/admin/errors", label: "Errors", badgeKey: "errors" },
    ],
  },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

async function fetchJsonOrThrow<T>(input: string): Promise<T> {
  const res = await fetch(input, {
    method: "GET",
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error("admin_sidebar_request_failed");
  }

  return (data ?? {}) as T;
}

export default function AdminSidebar() {
  const pathname = usePathname();

  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary>({});
  const [errorSummary, setErrorSummary] = useState<ErrorSummary>({});

  const [customerApprovalCount, setCustomerApprovalCount] = useState(0);
  const [contractorApprovalCount, setContractorApprovalCount] = useState(0);

  const [loadingFeedback, setLoadingFeedback] = useState(true);
  const [loadingErrors, setLoadingErrors] = useState(true);
  const [loadingCustomerApprovals, setLoadingCustomerApprovals] = useState(true);
  const [loadingContractorApprovals, setLoadingContractorApprovals] =
    useState(true);

  async function loadFeedbackSummary() {
    try {
      const data = await withErrorLogging(
        () => fetchJsonOrThrow<{ summary?: FeedbackSummary }>("/api/admin/feedback"),
        {
          message: "admin_sidebar_feedback_summary_load_failed",
          code: "admin_sidebar_feedback_summary_load_failed",
          source: "frontend",
          area: "admin",
          path: "/admin",
          role: "admin",
          details: {
            target: "/api/admin/feedback",
            component: "AdminSidebar",
          },
        }
      );

      setFeedbackSummary(data.summary || {});
    } catch {
      setFeedbackSummary({});
    } finally {
      setLoadingFeedback(false);
    }
  }

  async function loadErrorSummary() {
    try {
      const data = await withErrorLogging(
        () =>
          fetchJsonOrThrow<{ summary?: ErrorSummary }>(
            "/api/admin/errors?summary=true&resolved=false"
          ),
        {
          message: "admin_sidebar_error_summary_load_failed",
          code: "admin_sidebar_error_summary_load_failed",
          source: "frontend",
          area: "admin",
          path: "/admin",
          role: "admin",
          details: {
            target: "/api/admin/errors?summary=true&resolved=false",
            component: "AdminSidebar",
          },
        }
      );

      setErrorSummary(data.summary || {});
    } catch {
      setErrorSummary({});
    } finally {
      setLoadingErrors(false);
    }
  }

  async function loadCustomerApprovals() {
    try {
      const data = await withErrorLogging(
        () =>
          fetchJsonOrThrow<PendingCountResponse>(
            "/api/admin/customer-approvals/pending-count"
          ),
        {
          message: "admin_sidebar_customer_approvals_load_failed",
          code: "admin_sidebar_customer_approvals_load_failed",
          source: "frontend",
          area: "admin",
          path: "/admin",
          role: "admin",
          details: {
            target: "/api/admin/customer-approvals/pending-count",
            component: "AdminSidebar",
          },
        }
      );

      setCustomerApprovalCount(data.count ?? 0);
    } catch {
      setCustomerApprovalCount(0);
    } finally {
      setLoadingCustomerApprovals(false);
    }
  }

  async function loadContractorApprovals() {
    try {
      const data = await withErrorLogging(
        () =>
          fetchJsonOrThrow<PendingCountResponse>(
            "/api/admin/contractor-approvals/pending-count"
          ),
        {
          message: "admin_sidebar_contractor_approvals_load_failed",
          code: "admin_sidebar_contractor_approvals_load_failed",
          source: "frontend",
          area: "admin",
          path: "/admin",
          role: "admin",
          details: {
            target: "/api/admin/contractor-approvals/pending-count",
            component: "AdminSidebar",
          },
        }
      );

      setContractorApprovalCount(data.count ?? 0);
    } catch {
      setContractorApprovalCount(0);
    } finally {
      setLoadingContractorApprovals(false);
    }
  }

  async function loadAll() {
    await Promise.all([
      loadFeedbackSummary(),
      loadErrorSummary(),
      loadCustomerApprovals(),
      loadContractorApprovals(),
    ]);
  }

  useEffect(() => {
  void loadAll();

  const interval = setInterval(() => {
    void loadAll();
  }, 30000);

  const onFocus = () => {
    void loadAll();
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      void loadAll();
    }
  };

  const onManualRefresh = () => {
    void loadAll();
  };

  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener(
    "admin-sidebar-refresh",
    onManualRefresh as EventListener
  );

  return () => {
    clearInterval(interval);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener(
      "admin-sidebar-refresh",
      onManualRefresh as EventListener
    );
  };
}, [pathname]);

  const feedbackBadgeCount = loadingFeedback
    ? 0
    : feedbackSummary.attentionCount ?? 0;

  const errorBadgeCount = loadingErrors
    ? 0
    : errorSummary.unresolvedCount ?? 0;

  const customerApprovalBadgeCount = loadingCustomerApprovals
    ? 0
    : customerApprovalCount;

  const contractorApprovalBadgeCount = loadingContractorApprovals
    ? 0
    : contractorApprovalCount;

  return (
    <aside className="w-full rounded-2xl border border-[#D9E2EC] bg-white p-4 shadow-sm lg:sticky lg:top-6 lg:w-72 lg:self-start">
      <div className="border-b border-[#E5EDF5] pb-4">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
          LEOTEOR
        </div>
        <h2 className="mt-2 text-lg font-semibold text-[#0A2E5C]">Admin</h2>
        <p className="mt-1 text-sm text-[#4B5563]">
          Review queue, approvals, analytics, error logs, and feedback.
        </p>
      </div>

      <nav className="mt-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.title}>
            <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
              {group.title}
            </div>

            <div className="space-y-2">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href, item.exact);

                const showFeedbackBadge =
                  item.badgeKey === "feedback" && feedbackBadgeCount > 0;

                const showErrorBadge =
                  item.badgeKey === "errors" && errorBadgeCount > 0;

                const showCustomerApprovalsBadge =
                  item.badgeKey === "customerApprovals" &&
                  customerApprovalBadgeCount > 0;

                const showContractorApprovalsBadge =
                  item.badgeKey === "contractorApprovals" &&
                  contractorApprovalBadgeCount > 0;

                const badgeCount =
                  item.badgeKey === "feedback"
                    ? feedbackBadgeCount
                    : item.badgeKey === "errors"
                    ? errorBadgeCount
                    : item.badgeKey === "customerApprovals"
                    ? customerApprovalBadgeCount
                    : item.badgeKey === "contractorApprovals"
                    ? contractorApprovalBadgeCount
                    : 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? "border border-[#BFDBFE] bg-[#EAF4FF] text-[#0A2E5C]"
                        : "border border-transparent text-[#111827] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <span>{item.label}</span>

                    {showFeedbackBadge ||
                    showErrorBadge ||
                    showCustomerApprovalsBadge ||
                    showContractorApprovalsBadge ? (
                      <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-[#2EA3FF] px-2 py-0.5 text-xs font-semibold text-white">
                        {badgeCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-6 border-t border-[#E5EDF5] pt-4">
        <Link
          href="/dashboard"
          className="flex items-center rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
        >
          Back to dashboard
        </Link>
      </div>
    </aside>
  );
}