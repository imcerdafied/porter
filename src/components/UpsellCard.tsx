import type { UpsellCard as UpsellCardType } from "../hooks/useUpsellCards";
import { trackUpsellClick } from "../lib/trackUpsellClick";

const MOMENT_ICONS: Record<UpsellCardType["moment"], string> = {
  late_checkout: "🕐",
  spa: "🌿",
  dining: "🍽️",
  general: "✨",
};

interface UpsellCardProps {
  card: UpsellCardType;
  sessionId: string;
}

export function UpsellCard({ card, sessionId }: UpsellCardProps) {
  function handleCta() {
    trackUpsellClick(card, sessionId);
    window.open(card.destination_url, "_blank", "noopener,noreferrer");
  }

  return (
    <article className={`upsell-card upsell-card--${card.moment}`} aria-label={card.title}>
      <span className="upsell-card__icon" aria-hidden="true">{MOMENT_ICONS[card.moment]}</span>
      <div className="upsell-card__content">
        <h3 className="upsell-card__title">{card.title}</h3>
        <p className="upsell-card__body">{card.body}</p>
      </div>
      <button
        type="button"
        className="upsell-card__cta"
        onClick={handleCta}
        aria-label={`${card.cta_label} — ${card.title}`}
      >
        {card.cta_label}
      </button>
    </article>
  );
}
