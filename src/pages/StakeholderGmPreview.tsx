import { useState } from "react";
import { DateRangeSelector } from "../components/DateRangeSelector";
import { KPITile } from "../components/KPITile";
import type { DateRange } from "../hooks/useDashboardStats";

const PREVIEW_DATA: Record<DateRange, {
  deflectionRate: number;
  escalationRate: number;
  upsellClicks: number;
  identitiesCaptured: number;
  attributedRevenue: number;
  questionsAnswered: number;
}> = {
  "7d": {
    deflectionRate: 68.4,
    escalationRate: 6.5,
    upsellClicks: 63,
    identitiesCaptured: 54,
    attributedRevenue: 4210,
    questionsAnswered: 472,
  },
  "30d": {
    deflectionRate: 67.1,
    escalationRate: 6.8,
    upsellClicks: 201,
    identitiesCaptured: 214,
    attributedRevenue: 18400,
    questionsAnswered: 1847,
  },
  all: {
    deflectionRate: 67.1,
    escalationRate: 6.8,
    upsellClicks: 201,
    identitiesCaptured: 214,
    attributedRevenue: 18400,
    questionsAnswered: 1847,
  },
};

const INTENTS = [
  { label: "Pool and beach hours", share: 22 },
  { label: "Dining and menus", share: 18 },
  { label: "Late checkout", share: 14 },
  { label: "Directions", share: 11 },
  { label: "Spa", share: 9 },
];

export default function StakeholderGmPreview() {
  const [range, setRange] = useState<DateRange>("30d");
  const data = PREVIEW_DATA[range];

  return (
    <main className="dashboard-shell dashboard-shell--preview">
      <div className="preview-banner" role="note">
        <div>
          <a href="/review">← Review hub</a>
          <span><i aria-hidden="true" /> Stakeholder preview</span>
        </div>
        <strong>Simulated pilot data · No guest information</strong>
      </div>

      <header className="dashboard-header preview-dashboard-header">
        <div>
          <p className="eyebrow">Porter dashboard</p>
          <h1>Atlantis Resort</h1>
          <p className="preview-pilot-day">Day 22 of your 30-day pilot</p>
        </div>
        <DateRangeSelector value={range} onChange={setRange} />
      </header>

      <section className="preview-storyline" aria-label="Pilot summary">
        <div>
          <span>Questions answered</span>
          <strong>{data.questionsAnswered.toLocaleString()}</strong>
        </div>
        <p>
          Porter is answering routine questions after hours, handing uncertainty to staff, and making
          previously invisible guest intent measurable.
        </p>
      </section>

      <section className="dashboard-kpis">
        <KPITile label="Deflection rate" value={data.deflectionRate} format="percent" />
        <KPITile label="Escalation rate" value={data.escalationRate} format="percent" />
        <KPITile label="Upsell clicks" value={data.upsellClicks} />
        <KPITile label="Identities captured" value={data.identitiesCaptured} />
        <KPITile label="Revenue intent surfaced" value={data.attributedRevenue} format="currency" />
      </section>

      <div className="preview-dashboard-grid">
        <section className="intents-card">
          <p className="eyebrow">What guests need</p>
          <h2>Top guest intents</h2>
          <ol>
            {INTENTS.map((intent) => (
              <li key={intent.label}>
                <span>{intent.label}</span>
                <span className="intent-bar" aria-hidden="true"><i style={{ width: `${intent.share / 22 * 100}%` }} /></span>
                <strong>{intent.share}%</strong>
              </li>
            ))}
          </ol>
        </section>

        <section className="preview-handoffs-card">
          <p className="eyebrow">Philoxenia rule</p>
          <h2>Human handoffs</h2>
          <dl>
            <div><dt>Median time to human</dt><dd>1m 40s</dd></div>
            <div><dt>Guest re-explains</dt><dd>Never</dd></div>
            <div><dt>After-hours saves</dt><dd>289</dd></div>
          </dl>
          <p>When Porter is unsure, staff receive the conversation with context intact.</p>
        </section>
      </div>

      <section className="preview-renewal-card">
        <div>
          <p className="eyebrow">Renewal view</p>
          <h2>The pilot is showing measurable value before integration.</h2>
        </div>
        <dl>
          <div><dt>Pilot investment</dt><dd>$5,000</dd></div>
          <div><dt>Value surfaced</dt><dd>$23,700</dd></div>
        </dl>
      </section>

      <nav className="preview-next-actions" aria-label="Stakeholder preview navigation">
        <a href="/atlantis-pilot?review=1">View as a guest</a>
        <a href="/review">Return to review hub</a>
      </nav>
    </main>
  );
}
