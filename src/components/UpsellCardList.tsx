import { useSessionId } from "../hooks/useSessionId";
import { useUpsellCards } from "../hooks/useUpsellCards";
import { UpsellCard } from "./UpsellCard";

export function UpsellCardList({ propertyId }: { propertyId: string }) {
  const { cards, loading, error } = useUpsellCards(propertyId);
  const sessionId = useSessionId();

  if (loading) return <p className="upsell-cards__loading" aria-live="polite">Loading offers…</p>;
  if (error || cards.length === 0) return null;

  return (
    <section className="upsell-cards" aria-label="Special offers">
      <h2 className="upsell-cards__heading">Offers for your stay</h2>
      <ul className="upsell-cards__list">
        {cards.map((card) => (
          <li key={card.id}><UpsellCard card={card} sessionId={sessionId} /></li>
        ))}
      </ul>
    </section>
  );
}
