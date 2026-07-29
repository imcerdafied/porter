export function StepGoLive({ propertyName, approvedCount, sourcesCount, saving, error, onActivate }: { propertyName: string; approvedCount: number; sourcesCount: number; saving: boolean; error: string; onActivate: () => Promise<void> }) {
  return <section><h1>You&apos;re ready to go live.</h1><p>{propertyName}’s Porter concierge is ready to answer guests on WhatsApp using your approved knowledge.</p>
    <dl className="summary-card"><div><dt>Approved entries</dt><dd>{approvedCount}</dd></div><div><dt>Sources ingested</dt><dd>{sourcesCount}</dd></div></dl>
    {approvedCount === 0 && <p className="warning-text">You can activate now, but approving entries first gives guests better answers.</p>}
    {error && <p role="alert" className="error-text">{error}</p>}
    <button className="primary-button" disabled={saving} onClick={() => void onActivate()}>{saving ? "Activating…" : "Activate Porter"}</button>
  </section>;
}
