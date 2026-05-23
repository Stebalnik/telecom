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
  requiredCertifications?: string[];
  bidCount?: number;
};

export type PublicContractorPreview = {
  id: string;
  name: string;
  headline: string;
  homeMarket: string;
  markets: string[];
  services: string[];
  insuranceVerified: boolean;
  certificationsVerified: boolean;
  teamSize: string;
  responseSignal: string;
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

export type PublicJobsDirectorySnapshot = MarketplaceLandingSnapshot & {
  jobs: PublicJobPreview[];
};

export type PublicContractorsDirectorySnapshot = MarketplaceLandingSnapshot & {
  contractors: PublicContractorPreview[];
};

export type PublicContractorDetail = PublicContractorPreview & {
  trustBadges: string[];
  complianceSummary: string[];
};

export type PublicJobDetail = PublicJobPreview & {
  description: string;
  trustSignals: string[];
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

const fallbackJobsDirectorySnapshot: PublicJobsDirectorySnapshot = {
  ...fallbackSnapshot,
  jobs: [],
};

const fallbackContractorsDirectorySnapshot: PublicContractorsDirectorySnapshot = {
  ...fallbackSnapshot,
  contractors: [],
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

function relationName(value: unknown) {
  if (!value) return "";

  if (Array.isArray(value)) {
    const first = value[0] as { name?: string | null } | undefined;
    return safeText(first?.name, "");
  }

  return safeText((value as { name?: string | null }).name, "");
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
      services: ["Telecom execution"],
      insuranceVerified: false,
      certificationsVerified: false,
      teamSize: "Team details available during approval",
      responseSignal: "Active marketplace profile",
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

export async function getPublicContractorsDirectorySnapshot(): Promise<PublicContractorsDirectorySnapshot> {
  try {
    const supabase = await createClient();
    const baseSnapshot = await getMarketplaceLandingSnapshot();

    const rpcResult = await supabase.rpc("list_marketplace_contractors", {
      p_search: null,
    });

    if (!rpcResult.error && Array.isArray(rpcResult.data)) {
      return {
        ...baseSnapshot,
        contractors: (rpcResult.data as Array<{
          company_id: string;
          legal_name: string | null;
          dba_name: string | null;
          headline: string | null;
          home_market: string | null;
          markets: string[] | null;
          available_teams_count: number | null;
          insurance_types: string[] | null;
          average_rating: number | null;
          reviews_count: number | null;
        }>).map((contractor) => ({
          id: contractor.company_id,
          name: safeText(
            contractor.dba_name ?? contractor.legal_name,
            "Listed telecom contractor"
          ),
          headline: safeText(contractor.headline, "Telecom contractor profile"),
          homeMarket: normalizeMarket(contractor.home_market),
          markets: (contractor.markets ?? []).slice(0, 6),
          services: ["Telecom execution"],
          insuranceVerified: Boolean(contractor.insurance_types?.length),
          certificationsVerified: false,
          teamSize:
            contractor.available_teams_count && contractor.available_teams_count > 0
              ? `${contractor.available_teams_count} available teams`
              : "Team details available during approval",
          responseSignal:
            contractor.reviews_count && contractor.reviews_count > 0
              ? `${contractor.reviews_count} marketplace reviews`
              : "Active marketplace profile",
        })),
      };
    }

    const profilesResult = await supabase
      .from("contractor_public_profiles")
      .select("company_id,headline,home_market,markets,updated_at")
      .eq("is_listed", true)
      .order("updated_at", { ascending: false })
      .limit(40);

    if (profilesResult.error) {
      return fallbackContractorsDirectorySnapshot;
    }

    return {
      ...baseSnapshot,
      contractors: ((profilesResult.data ?? []) as Array<{
        company_id: string;
        headline: string | null;
        home_market: string | null;
        markets: string[] | null;
      }>).map((contractor, index) => ({
        id: contractor.company_id,
        name: `Listed contractor ${index + 1}`,
        headline: safeText(contractor.headline, "Telecom contractor profile"),
        homeMarket: normalizeMarket(contractor.home_market),
        markets: (contractor.markets ?? []).slice(0, 6),
        services: ["Telecom execution"],
        insuranceVerified: false,
        certificationsVerified: false,
        teamSize: "Team details available during approval",
        responseSignal: "Active marketplace profile",
      })),
    };
  } catch {
    return fallbackContractorsDirectorySnapshot;
  }
}

export async function getPublicContractorDetail(
  id: string
): Promise<PublicContractorDetail | null> {
  const snapshot = await getPublicContractorsDirectorySnapshot();
  const contractor = snapshot.contractors.find((item) => item.id === id);

  if (!contractor) {
    return null;
  }

  return {
    ...contractor,
    trustBadges: [
      "Active marketplace profile",
      contractor.insuranceVerified
        ? "Insurance verified"
        : "Insurance review pending",
      contractor.certificationsVerified
        ? "Certifications verified"
        : "Certifications review pending",
      contractor.markets.length ? "Markets published" : "Markets pending",
      contractor.teamSize,
    ],
    complianceSummary: [
      "Private insurance documents are protected",
      "Certification evidence is reviewed inside authenticated workflows",
      "Customer approval and invitation actions require sign in",
    ],
  };
}

export async function getPublicJobsDirectorySnapshot(): Promise<PublicJobsDirectorySnapshot> {
  try {
    const supabase = await createClient();
    const baseSnapshot = await getMarketplaceLandingSnapshot();

    const jobsResult = await supabase
      .from("jobs")
      .select("id,title,description,location,status,created_at")
      .eq("status", "open")
      .eq("visibility_mode", "public")
      .order("created_at", { ascending: false })
      .limit(40);

    if (jobsResult.error) {
      return fallbackJobsDirectorySnapshot;
    }

    const jobRows = (jobsResult.data ?? []) as Array<{
      id: string;
      title: string | null;
      description: string | null;
      location: string | null;
      status: string | null;
      created_at: string;
    }>;
    const jobIds = jobRows.map((job) => job.id);
    const [bidsResult, certsResult, scopesResult] = jobIds.length
      ? await Promise.all([
          supabase.from("bids").select("id,job_id").in("job_id", jobIds),
          supabase
            .from("job_required_certs")
            .select("job_id,cert_type:cert_types(name)")
            .in("job_id", jobIds),
          supabase
            .from("job_scopes")
            .select("job_id,scope:scopes(name)")
            .in("job_id", jobIds),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ];

    const bidCountByJob = new Map<string, number>();
    if (!bidsResult.error) {
      for (const bid of (bidsResult.data ?? []) as Array<{ job_id: string }>) {
        bidCountByJob.set(bid.job_id, (bidCountByJob.get(bid.job_id) ?? 0) + 1);
      }
    }

    const certsByJob = new Map<string, string[]>();
    if (!certsResult.error) {
      for (const row of (certsResult.data ?? []) as Array<{
        job_id: string;
        cert_type: { name: string | null } | null;
      }>) {
        const name = safeText(row.cert_type?.name, "");
        if (!name) continue;
        certsByJob.set(row.job_id, [...(certsByJob.get(row.job_id) ?? []), name]);
      }
    }

    const scopesByJob = new Map<string, string[]>();
    if (!scopesResult.error) {
      for (const row of (scopesResult.data ?? []) as Array<{
        job_id: string;
        scope: { name: string | null } | null;
      }>) {
        const name = safeText(row.scope?.name, "");
        if (!name) continue;
        scopesByJob.set(row.job_id, [...(scopesByJob.get(row.job_id) ?? []), name]);
      }
    }

    return {
      ...baseSnapshot,
      jobs: jobRows.map((job) => {
        const scopeLabels = scopesByJob.get(job.id) ?? [];
        const scopeFallback = safeText(
          job.description,
          "Scope available after sign up"
        ).slice(0, 180);

        return {
          id: job.id,
          title: safeText(job.title, "Telecom job"),
          market: normalizeMarket(job.location),
          scope: scopeLabels.length ? scopeLabels.join(", ") : scopeFallback,
          status: safeText(job.status, "open"),
          createdAt: job.created_at,
          requiredCertifications: certsByJob.get(job.id) ?? [],
          bidCount: bidCountByJob.get(job.id) ?? 0,
        };
      }),
    };
  } catch {
    return fallbackJobsDirectorySnapshot;
  }
}

export async function getPublicJobDetail(id: string): Promise<PublicJobDetail | null> {
  try {
    const supabase = await createClient();
    const jobResult = await supabase
      .from("jobs")
      .select("id,title,description,location,status,created_at,deadline_date")
      .eq("id", id)
      .eq("status", "open")
      .eq("visibility_mode", "public")
      .maybeSingle();

    if (jobResult.error || !jobResult.data) {
      return null;
    }

    const [bidsResult, certsResult, scopesResult] = await Promise.all([
      supabase.from("bids").select("id", { count: "exact", head: true }).eq("job_id", id),
      supabase
        .from("job_required_certs")
        .select("cert_type:cert_types(name)")
        .eq("job_id", id),
      supabase.from("job_scopes").select("scope:scopes(name)").eq("job_id", id),
    ]);

    const requiredCertifications = certsResult.error
      ? []
      : ((certsResult.data ?? []) as Array<{ cert_type: unknown }>)
          .map((row) => relationName(row.cert_type))
          .filter(Boolean);

    const scopes = scopesResult.error
      ? []
      : ((scopesResult.data ?? []) as Array<{ scope: unknown }>)
          .map((row) => relationName(row.scope))
          .filter(Boolean);

    const description = safeText(
      jobResult.data.description,
      "The customer has published a public-ready telecom job. Sign up to review protected workflow details and submit a bid when eligible."
    );

    return {
      id: jobResult.data.id,
      title: safeText(jobResult.data.title, "Telecom job"),
      market: normalizeMarket(jobResult.data.location),
      scope: scopes.length ? scopes.join(", ") : description.slice(0, 180),
      status: safeText(jobResult.data.status, "open"),
      createdAt: jobResult.data.created_at,
      description,
      requiredCertifications,
      bidCount: bidsResult.error ? 0 : bidsResult.count ?? 0,
      trustSignals: [
        "Public-ready listing",
        "Private contacts protected",
        requiredCertifications.length
          ? "Certification requirements published"
          : "Certification requirements pending review",
        scopes.length ? "Scope details available" : "Scope summary available",
      ],
    };
  } catch {
    return null;
  }
}
