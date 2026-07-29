import { useCallback, useEffect, useRef, useState } from "react";
import { logDashboardEvent } from "../lib/analytics";
import { supabase } from "../lib/supabase";

export type DateRange = "7d" | "30d" | "all";
export interface DashboardStats {
  totalConversations: number | null;
  deflectionRate: number | null;
  escalationRate: number | null;
  upsellClicks: number | null;
  identitiesCaptured: number | null;
  attributedRevenue: number | null;
  revenueConfig: { prearrival_window_hours: number; max_upsells_per_stay: number } | null;
  topIntents: { intent: string; conversation_count: number }[];
  loading: boolean;
  error: string | null;
}

export function isDateRange(value: string | null): value is DateRange {
  return value === "7d" || value === "30d" || value === "all";
}

export function sinceFromRange(range: DateRange, now = new Date()) {
  if (range === "all") return "1970-01-01T00:00:00.000Z";
  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - (range === "7d" ? 7 : 30));
  return since.toISOString();
}

const EMPTY: DashboardStats = { totalConversations: null, deflectionRate: null, escalationRate: null,
  upsellClicks: null, identitiesCaptured: null, attributedRevenue: null, revenueConfig: null,
  topIntents: [], loading: true, error: null };

export function useDashboardStats(propertyId: string | null, range: DateRange): DashboardStats {
  const [stats, setStats] = useState(EMPTY);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    if (!propertyId) return;
    const current = ++request.current;
    const since = sinceFromRange(range);
    const [statsResult, intentsResult, revenueResult, configResult] = await Promise.all([
      supabase.rpc("get_dashboard_stats", { p_property_id: propertyId, p_since: since }),
      supabase.rpc("get_top_intents", { p_property_id: propertyId, p_since: since, p_limit: 5 }),
      supabase.from("property_revenue_summary").select("total_attributed_revenue_usd,day").eq("property_id", propertyId).gte("day", since),
      supabase.from("property_revenue_config").select("prearrival_window_hours,max_upsells_per_stay").eq("property_id", propertyId).maybeSingle(),
    ]);
    if (current !== request.current) return;
    const error = statsResult.error ?? intentsResult.error ?? revenueResult.error ?? configResult.error;
    if (error) {
      setStats((previous) => ({ ...previous, loading: false, error: "Dashboard data could not be loaded. Try again shortly." }));
      void logDashboardEvent(propertyId, "dashboard_stats_error", { range, message: error.message });
      return;
    }
    const row = statsResult.data?.[0];
    const total = Number(row?.total_conversations ?? 0);
    setStats({ totalConversations: total || null,
      deflectionRate: total ? Number(row.resolved_conversations ?? 0) / total * 100 : null,
      escalationRate: total ? Number(row.escalated_conversations ?? 0) / total * 100 : null,
      upsellClicks: total || Number(row?.upsell_clicks ?? 0) ? Number(row?.upsell_clicks ?? 0) : null,
      identitiesCaptured: total ? Number(row.identities_captured ?? 0) : null,
      attributedRevenue: revenueResult.data?.length ? revenueResult.data.reduce((sum, item) => sum + Number(item.total_attributed_revenue_usd), 0) : null,
      revenueConfig: configResult.data,
      topIntents: (intentsResult.data ?? []).map((item: { intent: string; conversation_count: number | string }) => ({ ...item, conversation_count: Number(item.conversation_count) })),
      loading: false, error: null });
    void logDashboardEvent(propertyId, "dashboard_stats_loaded", { range, total_conversations: total });
  }, [propertyId, range]);

  useEffect(() => {
    setStats(EMPTY);
    void refresh();
    if (!propertyId) return;
    const channel = supabase.channel(`dashboard-conversations-${propertyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations", filter: `property_id=eq.${propertyId}` }, () => void refresh())
      .subscribe();
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => { request.current += 1; window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [propertyId, refresh]);
  return stats;
}
