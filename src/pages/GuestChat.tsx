import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ChatBubble } from "../components/ChatBubble";
import { ChatInput } from "../components/ChatInput";
import { ChatIdentityCapture } from "../components/ChatIdentityCapture";
import { UpsellCardList } from "../components/UpsellCardList";
import { WayfindingCTACard } from "../components/WayfindingCTACard";
import { useChat } from "../hooks/useChat";
import { detectWayfindingIntent } from "../hooks/useWayfindingIntent";
import { accessibleInk } from "../lib/color";
import { porterApi } from "../lib/api";
import type { PropertyConfig } from "../types";

export default function GuestChat({ slug }: { slug: string }) {
  const [property, setProperty] = useState<PropertyConfig | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [, setFunId] = useState(() => sessionStorage.getItem("porter_fun_id"));
  const { messages, isLoading, error, sendMessage } = useChat(slug);
  const logRef = useRef<HTMLDivElement>(null);
  const reviewMode = new URLSearchParams(window.location.search).get("review") === "1";
  const propertyId = new URLSearchParams(window.location.search).get("property")
    ?? import.meta.env.VITE_PROPERTY_ID
    ?? null;

  useEffect(() => {
    let current = true;
    porterApi.propertyConfig(slug)
      .then((result) => {
        if (current) setProperty(result);
      })
      .catch(() => {
        if (current) setPageError("We couldn't find this property concierge.");
      });
    return () => {
      current = false;
    };
  }, [slug]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [isLoading, messages]);

  if (pageError) {
    return (
      <main className="centered-state">
        <img alt="" src="/porter-icon.svg" />
        <h1>Concierge unavailable</h1>
        <p>{pageError}</p>
      </main>
    );
  }
  if (!property) {
    return (
      <main className="centered-state" aria-busy="true">
        <div className="loading-ring" />
        <p>Opening your concierge…</p>
      </main>
    );
  }

  const theme = {
    "--property-accent": property.accent_color,
    "--property-accent-ink": accessibleInk(property.accent_color),
  } as CSSProperties;
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const showWayfinding = messages.at(-1)?.role === "assistant"
    && Boolean(latestUserMessage && detectWayfindingIntent(latestUserMessage.content));
  const scenarios = [
    "When does the pool close?",
    "Can I get a late checkout tomorrow?",
    "My shower is leaking.",
  ];

  function resetReview() {
    sessionStorage.removeItem(`porter:${slug}:thread`);
    sessionStorage.removeItem("porter_fun_id");
    window.location.reload();
  }

  return (
    <main className="guest-shell" style={theme}>
      <section className={`chat-card${reviewMode ? " chat-card--review" : ""}`} aria-label={`${property.name} concierge`}>
        {reviewMode && (
          <aside className="review-preview-bar" aria-label="Stakeholder preview controls">
            <div>
              <a href="/review">← Review hub</a>
              <span>Guest perspective</span>
            </div>
            <button type="button" onClick={resetReview}>Reset conversation</button>
          </aside>
        )}
        <header className="chat-header">
          {property.logo_url ? (
            <img className="property-logo" src={property.logo_url} alt={`${property.name} logo`} />
          ) : (
            <span className="property-monogram" aria-hidden="true">
              {property.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div>
            <p className="eyebrow">Your concierge</p>
            <h1>{property.name}</h1>
          </div>
          <span className="online-status"><i /> Here to help</span>
        </header>

        <div className="message-log" role="log" aria-live="polite" ref={logRef}>
          <div className="welcome-block">
            <span className="welcome-mark">P</span>
            <p className="eyebrow">Welcome</p>
            <h2>How can I make your stay easier?</h2>
            <p>Ask about the property, dining, hours, or anything else on your mind.</p>
          </div>
          {reviewMode && messages.length === 0 && (
            <section className="review-scenarios" aria-labelledby="review-scenarios-title">
              <p id="review-scenarios-title">Try a stakeholder scenario</p>
              <div>
                {scenarios.map((scenario) => (
                  <button
                    key={scenario}
                    type="button"
                    disabled={isLoading}
                    onClick={() => void sendMessage(scenario)}
                  >
                    {scenario}
                  </button>
                ))}
              </div>
            </section>
          )}
          <ChatIdentityCapture onIdentityReady={setFunId} propertyId={propertyId ?? undefined} propertySlug={slug} />
          {propertyId && <UpsellCardList propertyId={propertyId} />}
          {messages.map((message) => <ChatBubble key={message.id} message={message} />)}
          {showWayfinding && <WayfindingCTACard propertyId={property.id} wayfindingEnabled={property.wayfinding_enabled} buildingId={property.phunware_building_id} />}
          {isLoading && (
            <div className="message-row message-row--assistant" aria-label="Concierge is typing">
              <div className="typing-indicator"><i /><i /><i /></div>
            </div>
          )}
          {error && <p className="inline-error" role="alert">{error}</p>}
        </div>

        <footer className="composer-wrap">
          <ChatInput disabled={isLoading} onSend={sendMessage} />
          <p>Powered by Porter · Property information only</p>
        </footer>
      </section>
    </main>
  );
}
