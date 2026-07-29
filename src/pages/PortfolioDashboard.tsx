import { type FormEvent, useState } from "react";
import { PortfolioNav } from "../components/PortfolioNav";
import { PropertyRow } from "../components/PropertyRow";
import { usePortfolio } from "../hooks/usePortfolio";

export default function PortfolioDashboard() {
  const state = usePortfolio(); const [name, setName] = useState(""); const [createError, setCreateError] = useState("");
  if (state.loading) return <main className="centered-state" aria-busy="true"><i className="loading-ring" /><p>Loading portfolio…</p></main>;
  async function create(event: FormEvent) { event.preventDefault(); const result = await state.createPortfolio(name.trim()); setCreateError(result.error ?? ""); }
  if (!state.portfolio) return <main className="portfolio-shell"><div className="portfolio-page"><p className="eyebrow">Porter portfolio</p><h1>Create your portfolio</h1><p>Manage shared knowledge and performance across all your properties.</p><form className="portfolio-form portfolio-create" onSubmit={create}><label htmlFor="portfolio-name">Portfolio name</label><input id="portfolio-name" required value={name} onChange={(event) => setName(event.target.value)} /><button className="primary-button" type="submit">Create portfolio</button>{createError && <p className="error-text" role="alert">{createError}</p>}</form></div></main>;
  const totalConversations = state.summaries.reduce((sum, item) => sum + item.conversations_30d, 0);
  const ratings = state.summaries.flatMap((item) => item.avg_guest_rating == null ? [] : [item.avg_guest_rating]);
  const avgRating = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null;
  const gaps = new Map<string, number>(); state.summaries.forEach((item) => { if (item.top_unanswered_category) gaps.set(item.top_unanswered_category, (gaps.get(item.top_unanswered_category) ?? 0) + 1); });
  const topGap = [...gaps].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  return <main className="portfolio-shell"><div className="portfolio-page"><header className="portfolio-header"><div><p className="eyebrow">Porter portfolio</p><h1>{state.portfolio.name}</h1></div></header><PortfolioNav />
    {state.error && <p className="error-text" role="alert">{state.error}</p>}
    <div className="portfolio-summary"><section aria-label="Total properties"><span>Total properties</span><strong>{state.properties.length}</strong></section><section aria-label="Total conversations"><span>Conversations · 30d</span><strong>{totalConversations.toLocaleString()}</strong></section><section aria-label="Average guest rating"><span>Average rating · 30d</span><strong>{avgRating == null ? "—" : avgRating.toFixed(1)}</strong></section><section aria-label="Top unanswered question category"><span>Top coverage gap</span><strong>{topGap}</strong></section></div>
    <section className="portfolio-panel" aria-labelledby="properties-title"><h2 id="properties-title">Properties</h2>{state.summaries.length ? <div className="table-scroll"><table><thead><tr><th scope="col">Property</th><th scope="col">Conversations · 30d</th><th scope="col">Avg rating</th><th scope="col">Coverage</th></tr></thead><tbody>{state.summaries.map((summary) => <PropertyRow key={summary.property_id} summary={summary} />)}</tbody></table></div> : <p>No properties have been added to this portfolio yet.</p>}</section>
  </div></main>;
}
