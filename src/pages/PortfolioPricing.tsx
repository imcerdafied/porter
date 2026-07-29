import { useEffect } from "react";
import { PortfolioNav } from "../components/PortfolioNav";
import { shouldShowGrowthNudge, usePortfolio } from "../hooks/usePortfolio";

export default function PortfolioPricing() {
  const state = usePortfolio(); const id = state.portfolio?.id; const showNudge = shouldShowGrowthNudge(state.properties.length);
  useEffect(() => { if (id) console.info("[portfolio]", "pricing_page_viewed", { portfolio_id: id, timestamp: new Date().toISOString() }); }, [id]);
  useEffect(() => { if (id && showNudge) console.info("[portfolio]", "growth_nudge_shown", { portfolio_id: id, timestamp: new Date().toISOString() }); }, [id, showNudge]);
  if (state.loading) return <main className="centered-state" aria-busy="true"><i className="loading-ring" /><p>Loading pricing…</p></main>;
  if (!state.portfolio) return <main className="centered-state"><h1>Portfolio not found</h1><a href="/portfolio">Create a portfolio</a></main>;
  const tiers = [{ key: "starter", name: "Starter", properties: "1–2", rate: "Base rate", notes: "Current default" }, { key: "growth", name: "Growth", properties: "3–9", rate: "15% discount", notes: "Auto-assigned at 3rd property" }, { key: "enterprise", name: "Enterprise", properties: "10+", rate: "Contact sales", notes: "Negotiated" }];
  return <main className="portfolio-shell"><div className="portfolio-page"><header className="portfolio-header"><div><p className="eyebrow">{state.portfolio.name}</p><h1>Portfolio pricing</h1></div></header><PortfolioNav />
    {showNudge && <p className="pricing-nudge">Add 1 more property to unlock Growth pricing — 15% off per property</p>}
    <section className="portfolio-panel" aria-labelledby="pricing-title"><h2 id="pricing-title">Volume pricing</h2><div className="table-scroll"><table className="pricing-table"><thead><tr><th scope="col">Tier</th><th scope="col">Properties</th><th scope="col">Per-property rate</th><th scope="col">Notes</th></tr></thead><tbody>{tiers.map((tier) => <tr key={tier.key} aria-current={state.portfolio?.pricing_tier === tier.key ? "true" : undefined}><th scope="row">{tier.name}</th><td>{tier.properties}</td><td>{tier.key === "enterprise" ? <a href="mailto:sales@porter.co">Contact sales</a> : tier.rate}</td><td>{tier.notes}</td></tr>)}</tbody></table></div></section>
  </div></main>;
}
