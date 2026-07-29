import { useEffect, useState } from "react";
import { trackEvent } from "../lib/analytics";
import { WayfindingModal } from "./WayfindingModal";

interface WayfindingCTACardProps {
  propertyId: string;
  wayfindingEnabled: boolean;
  buildingId?: string | null;
}

export function WayfindingCTACard({ propertyId, wayfindingEnabled, buildingId }: WayfindingCTACardProps) {
  const [open, setOpen] = useState(false);
  const available = wayfindingEnabled && Boolean(buildingId);

  useEffect(() => {
    trackEvent("wayfinding_cta_shown", { property_id: propertyId, wayfinding_enabled: available });
  }, [available, propertyId]);

  if (!available) return <aside className="wayfinding-card wayfinding-card--unavailable" role="note" aria-label="Wayfinding not available">🗺️ Ask the front desk for directions — or ask management to enable <strong>Porter Wayfinding</strong>.</aside>;

  return <>
    <button className="wayfinding-card wayfinding-card--cta" type="button" onClick={() => { trackEvent("wayfinding_cta_tapped", { property_id: propertyId }); setOpen(true); }} aria-label="Open property wayfinding map">🗺️ Find your way around →</button>
    {open && buildingId && <WayfindingModal buildingId={buildingId} onClose={() => setOpen(false)} />}
  </>;
}
