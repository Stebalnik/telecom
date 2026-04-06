"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  badgeKey?: "feedback";
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
      { href: "/admin/errors", label: "Errors" },
    ],
  },
  {
    title: "Reviews",
    items: [
      { href: "/admin/contractor-approvals", label: "Contractor Approvals" },
      { href: "/admin/company-change-requests", label: "Company Changes" },
      { href: "/admin/team-change-requests", label: "Team Changes" },
    ],
  },
  {
    title: "Support",
    items: [{ href: "/admin/feedback", label: "Feedback", badgeKey: "feedback" }],
  },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary>({});
  const [loading, setLoading] = useState(true);

  async function loadFeedbackSummary() {
    try {
      const res = await fetch("/api/admin/feedback", {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) return;

      setFeedbackSummary(data.summary || {});
    } catch {
      // keep sidebar resilient
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFeedbackSummary();

    const interval = setInterval(() => {
      loadFeedbackSummary();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const feedbackBadgeCount = loading ? 0 : feedbackSummary.attentionCount ?? 0;

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

                    {showFeedbackBadge ? (
                      <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-[#2EA3FF] px-2 py-0.5 text-xs font-semibold text-white">
                        {feedbackBadgeCount}
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