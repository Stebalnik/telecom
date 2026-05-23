import { MarketDetailView } from "../MarketDetailView";

export const dynamic = "force-dynamic";

export default async function StateMarketPage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state } = await params;
  return <MarketDetailView stateSlug={state} />;
}
