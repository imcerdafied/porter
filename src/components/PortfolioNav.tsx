const tabs = [
  ["/portfolio", "Dashboard"], ["/portfolio/templates", "Templates"], ["/portfolio/pricing", "Pricing"],
] as const;

export function PortfolioNav() {
  return <nav className="portfolio-nav" aria-label="Portfolio">
    {tabs.map(([href, label]) => <a key={href} href={href} aria-current={window.location.pathname === href ? "page" : undefined}>{label}</a>)}
  </nav>;
}
