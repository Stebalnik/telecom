import { createClient } from "@/lib/supabase/server";

type MarketplaceCount = {
  label: string;
  value: string;
  detail: string;
};

export type MarketplaceLandingSnapshot = {
  counters: MarketplaceCount[];
  recentActivity: string[];
};

const fallbackSnapshot: MarketplaceLandingSnapshot = {
  counters: [
    {
      label: "Open jobs",
      value: "0",
      detail: "Public-ready opportunities",
    },
    {
      label: "Contractors",
      value: "0",
      detail: "Listed telecom partners",
    },
    {
      label: "Markets",
      value: "0",
      detail: "Active service areas",
    },
    {
      label: "Bids",
      value: "0",
      detail: "Marketplace submissions",
    },
  ],
  recentActivity: [
    "Customer demand enters the marketplace",
    "Contractors qualify through compliance review",
    "Teams match against market and scope requirements",
  ],
};

function formatCount(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

function uniqueMarketCount(rows: Array<{ location?: string | null; markets?: string[] | null }>) {
  const markets = new Set<string>();

  for (const row of rows) {
    if (row.location?.trim()) {
      markets.add(row.location.trim().toLowerCase());
    }

    for (const market of row.markets ?? []) {
      if (market.trim()) {
        markets.add(market.trim().toLowerCase());
      }
    }
  }

  return markets.size;
}

export async function getMarketplaceLandingSnapshot(): Promise<MarketplaceLandingSnapshot> {
  try {
    const supabase = await createClient();

    const [jobsResult, contractorsResult, bidsResult, jobMarketsResult, contractorMarketsResult] =
      await Promise.all([
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("status", "open")
          .eq("visibility_mode", "public"),
        supabase
          .from("contractor_public_profiles")
          .select("company_id", { count: "exact", head: true })
          .eq("is_listed", true),
        supabase.from("bids").select("id", { count: "exact", head: true }),
        supabase
          .from("jobs")
          .select("location")
          .eq("status", "open")
          .eq("visibility_mode", "public")
          .limit(100),
        supabase
          .from("contractor_public_profiles")
          .select("markets")
          .eq("is_listed", true)
          .limit(100),
      ]);

    const hasQueryError =
      jobsResult.error ||
      contractorsResult.error ||
      bidsResult.error ||
      jobMarketsResult.error ||
      contractorMarketsResult.error;

    if (hasQueryError) {
      return fallbackSnapshot;
    }

    const marketCount = uniqueMarketCount([
      ...((jobMarketsResult.data ?? []) as Array<{ location: string | null }>),
      ...((contractorMarketsResult.data ?? []) as Array<{ markets: string[] | null }>),
    ]);

    return {
      counters: [
        {
          label: "Open jobs",
          value: formatCount(jobsResult.count),
          detail: "Public-ready opportunities",
        },
        {
          label: "Contractors",
          value: formatCount(contractorsResult.count),
          detail: "Listed telecom partners",
        },
        {
          label: "Markets",
          value: formatCount(marketCount),
          detail: "Active service areas",
        },
        {
          label: "Bids",
          value: formatCount(bidsResult.count),
          detail: "Marketplace submissions",
        },
      ],
      recentActivity: [
        jobsResult.count && jobsResult.count > 0
          ? `${formatCount(jobsResult.count)} public jobs are open for qualified contractors`
          : "Public-ready telecom jobs will appear as customers publish demand",
        contractorsResult.count && contractorsResult.count > 0
          ? `${formatCount(contractorsResult.count)} contractors are listed for discovery`
          : "Verified contractor profiles will appear as teams complete onboarding",
        bidsResult.count && bidsResult.count > 0
          ? `${formatCount(bidsResult.count)} bids have moved through marketplace workflows`
          : "Bid activity will appear after contractors start responding to jobs",
      ],
    };
  } catch {
    return fallbackSnapshot;
  }
}
