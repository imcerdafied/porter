import { useState } from "react";

export function StaffReplyBox({ onSend }: { onSend: (message: string) => Promise<void> }) {
  const [message, setMessage] = useState(""); const [sending, setSending] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent) { event.preventDefault(); if (!message.trim()) return; setError(""); setSending(true); try { await onSend(message.trim()); setMessage(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "Your reply could not be sent. Try again."); } finally { setSending(false); } }
  return <form className="staff-reply" onSubmit={(event) => void submit(event)}>
    <label htmlFor="staff-reply-message">Reply to guest</label>
    <textarea id="staff-reply-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} rows={3} placeholder="Type your reply…" required />
    {error && <p className="error-text" role="alert">{error}</p>}
    <button className="primary-button" disabled={sending || !message.trim()}>{sending ? "Sending…" : "Send reply"}</button>
  </form>;
}
