import { useEffect, useMemo, useState } from "react";
import { DateRangeSelector } from "../components/DateRangeSelector";
import { KPITile } from "../components/KPITile";
import { useAuth } from "../hooks/useAuth";
import { isDateRange, useDashboardStats, type DateRange } from "../hooks/useDashboardStats";
import { useProperty } from "../hooks/useProperty";
import { logDashboardEvent } from "../lib/analytics";
import { supabase } from "../lib/supabase";

export default function GmDashboard() {
  const auth = useAuth();
  const propertyState = useProperty(auth.user?.id);
  const initialRange = useMemo(() => { const value = new URLSearchParams(window.location.search).get("range"); return isDateRange(value) ? value : "7d"; }, []);
  const [range, setRange] = useState<DateRange>(initialRange);
  const [reportError, setReportError] = useState("");
  const property = propertyState.property;
  const stats = useDashboardStats(property?.id ?? null, range);

  useEffect(() => {
    if (!auth.loading && !auth.user) window.location.replace("/");
  }, [auth.loading, auth.user]);
  useEffect(() => {
    if (!property) return;
    void logDashboardEvent(property.id, "dashboard_viewed", { range });
    return () => { void logDashboardEvent(property.id, "dashboard_exited", { range }); };
  }, [property?.id]); // range changes are recorded separately

  if (auth.loading || (auth.user && propertyState.loading)) return <main className="centered-state" aria-busy="true"><i className="loading-ring" /><p>Loading dashboard…</p></main>;
  if (!auth.user) return null;
  if (!property || property.status !== "active" || !["gm", "admin"].includes(property.staff_role ?? "gm")) {
    window.location.replace("/"); return null;
  }
  function changeRange(next: DateRange) {
    setRange(next);
    const url = new URL(window.location.href); url.searchParams.set("range", next); window.history.replaceState(null, "", url);
    void logDashboardEvent(property!.id, "dashboard_range_changed", { range: next });
  }
  async function downloadReport() {
    setReportError("");
    void logDashboardEvent(property!.id, "report_download_started");
    const { data, error } = await supabase.storage.from("pilot-reports").createSignedUrl(`${property!.id}/day30.pdf`, 60 * 60 * 24 * 7, { download: `${property!.name} day-30 report.pdf` });
    if (error || !data?.signedUrl) {
      setReportError("The report download could not be prepared. Try again shortly.");
      void logDashboardEvent(property!.id, "report_download_error", { message: error?.message ?? "Missing signed URL" }); return;
    }
    void logDashboardEvent(property!.id, "report_download_completed");
    window.location.assign(data.signedUrl);
  }
  const maxIntent = stats.topIntents[0]?.conversation_count ?? 1;
  return <main className="dashboard-shell">
    <header className="dashboard-header"><div><p className="eyebrow">Porter dashboard</p><h1>{property.name}</h1></div><DateRangeSelector value={range} onChange={changeRange} /></header>
    {stats.error && <p className="error-text" role="alert">{stats.error}</p>}
    <section className="dashboard-kpis" aria-label="Key performance indicators">
      <KPITile label="Deflection rate" value={stats.deflectionRate} format="percent" loading={stats.loading} />
      <KPITile label="Escalation rate" value={stats.escalationRate} format="percent" loading={stats.loading} />
      <KPITile label="Upsell clicks" value={stats.upsellClicks} loading={stats.loading} />
      <KPITile label="Identities captured" value={stats.identitiesCaptured} loading={stats.loading} />
    </section>
    <section className="intents-card" aria-labelledby="top-intents-title"><h2 id="top-intents-title">Top intents</h2>
      {stats.loading ? <p aria-live="polite">Loading intents…</p> : stats.topIntents.length === 0 ? <p aria-live="polite">—</p> :
        <ol>{stats.topIntents.map((item) => <li key={item.intent}><span>{item.intent}</span><span className="intent-bar" aria-hidden="true"><i style={{ width: `${item.conversation_count / maxIntent * 100}%` }} /></span><strong aria-label={`${item.conversation_count} conversations`}>{item.conversation_count}</strong></li>)}</ol>}
    </section>
    {property.pilot_report_status === "ready" && <section className="report-card"><h2>30-day pilot report</h2><p>Share the full pilot results with your ownership team.</p><button className="primary-button" type="button" onClick={() => void downloadReport()}>Download Day-30 Report</button>{reportError && <p className="error-text" role="alert">{reportError}</p>}</section>}
    <button className="text-button dashboard-signout" onClick={() => void auth.signOut().then(() => window.location.assign("/"))}>Sign out</button>
  </main>;
}
