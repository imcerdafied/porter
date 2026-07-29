import { useEffect, useRef } from "react";

interface WayfindingModalProps { buildingId: string; onClose: () => void }

// TODO: Verify this public embed URL against the Phunware Web SDK documentation before production rollout.
const PHUNWARE_BASE_URL = "https://maps.phunware.com/v3";

export function WayfindingModal({ buildingId, onClose }: WayfindingModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return <div className="wayfinding-modal" role="dialog" aria-modal="true" aria-label="Property wayfinding map" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="wayfinding-modal__panel">
      <header><h2>Find your way around</h2><button ref={closeRef} type="button" onClick={onClose} aria-label="Close property wayfinding map">✕</button></header>
      <iframe src={`${PHUNWARE_BASE_URL}/${encodeURIComponent(buildingId)}`} title="Property indoor map" allow="geolocation" />
    </div>
  </div>;
}
