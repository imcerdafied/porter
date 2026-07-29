import { useEffect, useState } from "react";
import { trackEvent } from "../lib/analytics";
import { supabase } from "../lib/supabase";

const UPSELL_URL = import.meta.env.VITE_WAYFINDING_UPSELL_URL as string | undefined;

interface Props { propertyId: string; wayfindingTier: "none" | "basic" | "premium"; wayfindingEnabled: boolean; onUpdated: () => void }

export function WayfindingUpsellCard({ propertyId, wayfindingTier, wayfindingEnabled, onUpdated }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => { if (wayfindingTier === "none") trackEvent("wayfinding_upsell_shown", { property_id: propertyId }); }, [propertyId, wayfindingTier]);

  async function toggleWayfinding() {
    setLoading(true); setError(null); setSuccess(false);
    const { error: updateError } = await supabase.from("properties").update({ wayfinding_enabled: !wayfindingEnabled }).eq("id", propertyId);
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    setSuccess(true); onUpdated();
  }

  if (wayfindingTier === "none") return <section className="wayfinding-upsell" aria-label="Wayfinding upsell">
    <h2>🗺️ Porter Wayfinding</h2>
    <p>Give guests turn-by-turn indoor directions, reduce front-desk calls, and help everyone explore with confidence.</p>
    {/* TODO: Define VITE_WAYFINDING_UPSELL_URL when the sales destination is finalized. */}
    <button className="primary-button" type="button" disabled={!UPSELL_URL} title={UPSELL_URL ? undefined : "Contact your Porter account manager"} onClick={() => { trackEvent("wayfinding_upsell_cta_tapped", { property_id: propertyId }); if (UPSELL_URL) window.open(UPSELL_URL, "_blank", "noopener,noreferrer"); }}>Learn more and activate Porter Wayfinding</button>
    {!UPSELL_URL && <p className="field-note">Contact your Porter account manager to activate wayfinding.</p>}
  </section>;

  return <section className="wayfinding-upsell" aria-label="Wayfinding settings">
    <h2>🗺️ Porter Wayfinding</h2><p><strong className="capitalize">{wayfindingTier}</strong> tier — {wayfindingEnabled ? "Active for guests." : "Ready to activate."}</p>
    <button className="primary-button" type="button" aria-pressed={wayfindingEnabled} disabled={loading} onClick={() => void toggleWayfinding()}>{loading ? "Saving…" : wayfindingEnabled ? "Deactivate Porter Wayfinding" : "Activate Porter Wayfinding"}</button>
    {error && <p className="error-text" role="alert">{error}</p>}{success && <p className="success-text" role="status">Saved successfully.</p>}
  </section>;
}
