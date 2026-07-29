export interface EscalationSummary {
  id: string; status: "new" | "in_progress" | "resolved"; reason: string; created_at: string;
  conversations: { id: string; channel: "web" | "sms" | "whatsapp"; guest_name: string | null; thread_key: string };
  lastMessage?: string;
}

export function EscalationCard({ escalation, selected, onSelect }: { escalation: EscalationSummary; selected: boolean; onSelect: () => void }) {
  const channel = escalation.conversations.channel === "whatsapp" ? "WhatsApp" : escalation.conversations.channel.toUpperCase();
  return <li><button className={`escalation-card${selected ? " escalation-card--selected" : ""}`} type="button" onClick={onSelect} aria-current={selected ? "true" : undefined}>
    <span className="escalation-card__top"><strong>{escalation.conversations.guest_name || "Guest"}</strong><span className={`escalation-badge escalation-badge--${escalation.status}`}>{escalation.status === "in_progress" ? "In Progress" : "New"}</span></span>
    <span className="escalation-card__meta">{channel} · <time dateTime={escalation.created_at}>{new Date(escalation.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</time></span>
    <span className="escalation-card__snippet">{escalation.lastMessage || "Open to view the conversation"}</span>
  </button></li>;
}
