import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type PricingTier = "starter" | "growth" | "enterprise";
export interface Portfolio { id: string; name: string; owner_user_id: string; pricing_tier: PricingTier; created_at: string }
export interface PortfolioProperty { portfolio_id: string; property_id: string; added_at: string; name: string }
export interface PropertySummary { property_id: string; property_name: string; conversations_30d: number; avg_guest_rating: number | null; coverage_gap: boolean; top_unanswered_category: string | null }

export function shouldShowGrowthNudge(propertyCount: number) { return propertyCount === 2; }

export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [properties, setProperties] = useState<PortfolioProperty[]>([]);
  const [summaries, setSummaries] = useState<PropertySummary[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const [{ data: auth }, portfolioResult] = await Promise.all([
      supabase.auth.getUser(), supabase.from("portfolios").select("*").limit(1).maybeSingle(),
    ]);
    if (portfolioResult.error) { setError("Could not load this portfolio. Try again."); setLoading(false); return; }
    const next = portfolioResult.data as Portfolio | null;
    setPortfolio(next); setCanManage(Boolean(next && auth.user?.id === next.owner_user_id));
    if (!next) { setProperties([]); setSummaries([]); setLoading(false); return; }
    const [linksResult, summaryResult] = await Promise.all([
      supabase.from("portfolio_properties").select("portfolio_id,property_id,added_at,properties(name)").eq("portfolio_id", next.id),
      supabase.rpc("get_portfolio_dashboard", { p_portfolio_id: next.id }),
    ]);
    if (linksResult.error || summaryResult.error) setError("Could not load portfolio activity. Try again.");
    setProperties((linksResult.data ?? []).map((row: any) => ({ portfolio_id: row.portfolio_id, property_id: row.property_id, added_at: row.added_at, name: row.properties?.name ?? "Property" })));
    setSummaries((summaryResult.data ?? []).map((row: any) => ({ ...row, conversations_30d: Number(row.conversations_30d) })));
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function createPortfolio(name: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Please sign in to create a portfolio." };
    const { data, error: mutationError } = await supabase.from("portfolios").insert({ name, owner_user_id: user.id }).select().single();
    if (mutationError || !data) return { error: "Could not create portfolio. Try again." };
    const { data: ownedProperties } = await supabase.from("properties").select("id").eq("owner_id", user.id);
    if (ownedProperties?.length) await supabase.from("portfolio_properties").insert(ownedProperties.map((property) => ({ portfolio_id: data.id, property_id: property.id })));
    setPortfolio(data as Portfolio); setCanManage(true); await load();
    console.info("[portfolio]", "portfolio_created", { portfolio_id: data.id, timestamp: new Date().toISOString() });
    return { error: null };
  }
  return { portfolio, properties, summaries, canManage, loading, error, createPortfolio, refresh: load };
}
