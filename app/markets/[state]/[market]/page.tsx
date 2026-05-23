import { MarketDetailView } from "../../MarketDetailView";

export const dynamic = "force-dynamic";

export default async function LocalMarketPage({
  params,
}: {
  params: Promise<{ state: string; market: string }>;
}) {
  const { state, market } = await params;
  return <MarketDetailView stateSlug={state} marketSlug={market} />;
}
