import { useEffect, useRef } from "react";
import type { EscalationSummary } from "./EscalationCard";
import { StaffReplyBox } from "./StaffReplyBox";

export interface ConversationMessage { id: string; role: "user" | "assistant" | "staff"; content: string; created_at: string }
export function ConversationThread({ escalation, messages, loading, onSend, onResolve, onReassign }: { escalation: EscalationSummary; messages: ConversationMessage[]; loading: boolean; onSend: (message: string) => Promise<void>; onResolve: () => Promise<void>; onReassign: () => Promise<void> }) {
  const heading = useRef<HTMLHeadingElement>(null); useEffect(() => heading.current?.focus(), [escalation.id]);
  return <section className="conversation-panel" aria-labelledby="conversation-title">
    <header className="conversation-panel__header"><div><p className="eyebrow">{escalation.conversations.channel} conversation</p><h2 id="conversation-title" tabIndex={-1} ref={heading}>{escalation.conversations.guest_name || "Guest"}</h2></div><div className="conversation-actions"><button className="secondary-button" onClick={() => void onReassign()}>Re-assign to AI</button><button className="primary-button" onClick={() => void onResolve()}>Mark resolved</button></div></header>
    <div className="conversation-log" aria-live="polite" aria-busy={loading}>{loading ? <p>Loading conversation…</p> : messages.length === 0 ? <p>No messages yet.</p> : messages.map((message) => <article key={message.id} className={`thread-message thread-message--${message.role}`}><strong>{message.role === "user" ? "Guest" : message.role === "assistant" ? "Porter AI" : "Staff"}</strong><p>{message.content}</p><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></article>)}</div>
    <StaffReplyBox onSend={onSend} />
  </section>;
}
