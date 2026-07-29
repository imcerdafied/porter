const guestUrl = "/atlantis-pilot?review=1";

export default function StakeholderReview() {
  return (
    <main className="review-shell">
      <header className="review-hero">
        <a className="review-wordmark" href="/review" aria-label="Porter stakeholder review home">
          <span aria-hidden="true">P</span>
          Porter
        </a>
        <div className="review-preview-label">
          <i aria-hidden="true" />
          Stakeholder preview
        </div>
        <p className="eyebrow">One pilot, two perspectives</p>
        <h1>See Porter through the eyes of a guest and a GM.</h1>
        <p className="review-lede">
          Explore the live concierge, then step into a read-only pilot dashboard that shows how guest
          conversations become service, revenue, and renewal evidence.
        </p>
      </header>

      <section className="review-perspectives" aria-label="Choose a Porter perspective">
        <a className="review-perspective-card review-perspective-card--guest" href={guestUrl}>
          <span className="review-card-number">01</span>
          <div>
            <p className="eyebrow">Guest perspective</p>
            <h2>Ask Porter for help</h2>
            <p>Try property questions, an upsell moment, or a maintenance issue—without an app or login.</p>
          </div>
          <strong>Open guest concierge <span aria-hidden="true">→</span></strong>
        </a>

        <a className="review-perspective-card review-perspective-card--gm" href="/review/gm">
          <span className="review-card-number">02</span>
          <div>
            <p className="eyebrow">GM perspective</p>
            <h2>Review the pilot</h2>
            <p>See the read-only operating view a GM uses to understand deflection, escalations, and value.</p>
          </div>
          <strong>Open GM dashboard <span aria-hidden="true">→</span></strong>
        </a>
      </section>

      <footer className="review-footer">
        <span>Atlantis Resort · 30-day pilot</span>
        <span>Guest experience is live · GM data is simulated</span>
      </footer>
    </main>
  );
}
