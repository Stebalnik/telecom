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

export type PublicJobPreview = {
  id: string;
  title: string;
  market: string;
  scope: string;
  status: string;
  createdAt: string;
};

export type PublicContractorPreview = {
  id: string;
  name: string;
  headline: string;
  homeMarket: string;
  markets: string[];
};

export type PublicMarketPreview = {
  name: string;
  openJobs: number;
  activeContractors: number;
};

export type MarketplaceHubSnapshot = MarketplaceLandingSnapshot & {
  openJobs: PublicJobPreview[];
  contractors: PublicContractorPreview[];
  markets: PublicMarketPreview[];
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

const fallbackHubSnapshot: MarketplaceHubSnapshot = {
  ...fallbackSnapshot,
  openJobs: [],
  contractors: [],
  markets: [],
};

function formatCount(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

function safeText(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function normalizeMarket(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return "Market pending";

  const parts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
  }

  return trimmed;
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

export async function getMarketplaceHubSnapshot(): Promise<MarketplaceHubSnapshot> {
  try {
    const supabase = await createClient();
    const baseSnapshot = await getMarketplaceLandingSnapshot();

    const [jobsResult, contractorsResult] = await Promise.all([
      supabase
        .from("jobs")
        .select("id,title,description,location,status,created_at")
        .eq("status", "open")
        .eq("visibility_mode", "public")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("contractor_public_profiles")
        .select("company_id,headline,home_market,markets,updated_at")
        .eq("is_listed", true)
        .order("updated_at", { ascending: false })
        .limit(6),
    ]);

    if (jobsResult.error || contractorsResult.error) {
      return fallbackHubSnapshot;
    }

    const openJobs = ((jobsResult.data ?? []) as Array<{
      id: string;
      title: string | null;
      description: string | null;
      location: string | null;
      status: string | null;
      created_at: string;
    }>).map((job) => ({
      id: job.id,
      title: safeText(job.title, "Telecom job"),
      market: normalizeMarket(job.location),
      scope: safeText(job.description, "Scope available after sign up").slice(0, 140),
      status: safeText(job.status, "open"),
      createdAt: job.created_at,
    }));

    const contractors = ((contractorsResult.data ?? []) as Array<{
      company_id: string;
      headline: string | null;
      home_market: string | null;
      markets: string[] | null;
    }>).map((contractor, index) => ({
      id: contractor.company_id,
      name: `Listed contractor ${index + 1}`,
      headline: safeText(contractor.headline, "Telecom contractor profile"),
      homeMarket: normalizeMarket(contractor.home_market),
      markets: (contractor.markets ?? []).slice(0, 4),
    }));

    const marketMap = new Map<string, PublicMarketPreview>();
    for (const job of openJobs) {
      const current = marketMap.get(job.market) ?? {
        name: job.market,
        openJobs: 0,
        activeContractors: 0,
      };
      current.openJobs += 1;
      marketMap.set(job.market, current);
    }

    for (const contractor of contractors) {
      const contractorMarkets = contractor.markets.length
        ? contractor.markets
        : [contractor.homeMarket];
      for (const marketName of contractorMarkets) {
        const normalized = normalizeMarket(marketName);
        const current = marketMap.get(normalized) ?? {
          name: normalized,
          openJobs: 0,
          activeContractors: 0,
        };
        current.activeContractors += 1;
        marketMap.set(normalized, current);
      }
    }

    return {
      ...baseSnapshot,
      openJobs,
      contractors,
      markets: [...marketMap.values()].slice(0, 6),
    };
  } catch {
    return fallbackHubSnapshot;
  }
}
