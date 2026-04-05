"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/track";
import type { AnalyticsEventName } from "@/lib/analytics/events";

type Props = {
  event: AnalyticsEventName;
  role?: string | null;
  meta?: Record<string, unknown>;
};

export default function TrackPageView({ event, role = null, meta = {} }: Props) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;

    track(event, {
      role,
      meta,
    });
  }, [event, role, meta]);

  return null;
}