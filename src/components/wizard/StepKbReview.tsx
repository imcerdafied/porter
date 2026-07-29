import { useState } from "react";
import type { KnowledgeEntry } from "../../hooks/useKnowledgeEntries";

function EntryCard({ entry, onUpdate }: { entry: KnowledgeEntry; onUpdate: (id: string, updates: Pick<KnowledgeEntry, "body"> | Pick<KnowledgeEntry, "status">) => Promise<void> }) {
  const [body, setBody] = useState(entry.body); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  async function act(updates: Pick<KnowledgeEntry, "body"> | Pick<KnowledgeEntry, "status">, success: string) {
    setSaving(true); setMessage(""); setError("");
    try { await onUpdate(entry.id, updates); setMessage(success); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not update this entry."); }
    finally { setSaving(false); }
  }
  return <article className="entry-card"><h2>{entry.title}</h2><label htmlFor={`entry-${entry.id}`}>Answer</label><textarea id={`entry-${entry.id}`} value={body} onChange={(e) => setBody(e.target.value)} rows={5} />
    <div className="entry-actions"><button disabled={saving} onClick={() => void act({ body }, "Saved")}>Save entry</button><button disabled={saving || entry.status === "approved"} onClick={() => void act({ status: "approved" }, "Approved")}>Approve</button><button className="danger-button" disabled={saving} onClick={() => void act({ status: "deleted" }, "Deleted")}>Delete</button></div>
    {message && <p className="success-text" role="status">{message}</p>}
    {error && <p className="error-text" role="alert">{error}</p>}</article>;
}

export function StepKbReview({ entries, loading, onUpdate, onAdd, onContinue }: { entries: KnowledgeEntry[]; loading: boolean; onUpdate: (id: string, updates: Pick<KnowledgeEntry, "body"> | Pick<KnowledgeEntry, "status">) => Promise<void>; onAdd: (title: string, body: string) => Promise<void>; onContinue: () => Promise<void> }) {
  const [adding, setAdding] = useState(false); const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [error, setError] = useState("");
  async function add(event: React.FormEvent) { event.preventDefault(); if (!title.trim() || !body.trim()) return setError("Enter both a question and answer."); try { await onAdd(title, body); setTitle(""); setBody(""); setAdding(false); setError(""); } catch (err) { setError(err instanceof Error ? err.message : "Could not add this entry."); } }
  return <section><h1>Review and refine your knowledge base</h1><p>Edit each answer, approve it, or remove anything guests should not see.</p>
    {loading && <div className="loading-state" aria-busy="true"><i className="loading-ring" /> Loading entries…</div>}
    <div className="entry-list">{entries.map((entry) => <EntryCard key={entry.id} entry={entry} onUpdate={onUpdate} />)}</div>
    {adding ? <form className="entry-card wizard-form" onSubmit={add}><h2>New FAQ entry</h2><label htmlFor="manual-title">Question or title</label><input id="manual-title" value={title} onChange={(e) => setTitle(e.target.value)} /><label htmlFor="manual-body">Answer</label><textarea id="manual-body" value={body} onChange={(e) => setBody(e.target.value)} />{error && <p role="alert" className="error-text">{error}</p>}<div className="entry-actions"><button className="primary-button">Save entry</button><button type="button" onClick={() => setAdding(false)}>Cancel</button></div></form> : <button className="secondary-button" onClick={() => setAdding(true)}>Add FAQ entry</button>}
    <button className="primary-button continue-button" disabled={entries.length === 0} onClick={() => void onContinue()}>Continue →</button>
  </section>;
}
