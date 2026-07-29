import type { IngestionSource } from "../../hooks/useIngestionSources";

export function StepIngestionStatus({ sources, loading, onContinue }: { sources: IngestionSource[]; loading: boolean; onContinue: () => Promise<void> }) {
  const done = sources.some((source) => source.status === "done");
  return <section><h1>Reviewing your sources…</h1><p>You can leave this page open—we’ll update each source automatically.</p>
    {loading && <div className="loading-state" aria-busy="true"><i className="loading-ring" /> Loading sources…</div>}
    <ul className="source-list">{sources.map((source) => <li key={source.id}><span>{source.label}</span><strong className={`status status--${source.status}`}>{source.status}</strong>{source.status === "error" && <p role="alert" className="error-text">Ingestion failed — try re-uploading this file.</p>}</li>)}</ul>
    <button className="primary-button" disabled={!done} onClick={() => void onContinue()}>Continue →</button>
    {!done && sources.length > 0 && <p className="field-note">Continue becomes available when at least one source is done.</p>}
  </section>;
}
