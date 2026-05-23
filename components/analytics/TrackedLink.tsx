"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { track } from "@/lib/analytics/track";
import type { AnalyticsEventName } from "@/lib/analytics/events";

type Props = {
  href: string;
  event: AnalyticsEventName;
  role?: string | null;
  meta?: Record<string, unknown>;
  className?: string;
  children: ReactNode;
};

export default function TrackedLink({
  href,
  event,
  role = null,
  meta = {},
  className,
  children,
}: Props) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        void track(event, { role, meta });
      }}
    >
      {children}
    </Link>
  );
}
