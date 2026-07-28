import { useState } from "react";

const MAX_SIZE = 20 * 1024 * 1024;
export function StepSourceIngestion({ onSubmit }: { onSubmit: (input: { url?: string; faq?: string; files: File[] }) => Promise<unknown> }) {
  const [url, setUrl] = useState(""); const [faq, setFaq] = useState(""); const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  function chooseFiles(list: FileList | null) {
    const next = Array.from(list ?? []);
    if (next.length > 10) return setError("Upload up to 10 PDF files.");
    if (next.some((file) => file.type !== "application/pdf")) return setError("Only PDF files can be uploaded.");
    if (next.some((file) => file.size > MAX_SIZE)) return setError("PDF exceeds 20 MB limit");
    setError(""); setFiles(next);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!url.trim() && !faq.trim() && files.length === 0) return setError("Add at least one website, PDF, or FAQ source.");
    if (url && (!url.startsWith("https://") || !URL.canParse(url))) return setError("Please enter a valid URL starting with https://");
    setSaving(true); setError("");
    try { await onSubmit({ url: url.trim() || undefined, faq: faq.trim() || undefined, files }); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not start ingestion."); }
    finally { setSaving(false); }
  }
  return <section><h1>Add your content sources</h1><p>Add one or more sources. Porter will turn them into reviewable answers.</p>
    <form className="wizard-form" onSubmit={submit} noValidate>
      <label htmlFor="website-url">Property website URL</label><input id="website-url" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hotel.example" />
      <label htmlFor="pdf-files">Property PDFs (up to 10, 20 MB each)</label><input id="pdf-files" type="file" accept="application/pdf,.pdf" multiple onChange={(e) => chooseFiles(e.target.files)} />
      {files.length > 0 && <p className="field-note">{files.length} PDF{files.length > 1 ? "s" : ""} selected</p>}
      <label htmlFor="faq-content">Frequently asked questions</label><textarea id="faq-content" rows={7} value={faq} onChange={(e) => setFaq(e.target.value)} placeholder="What time is check-in? Check-in starts at 3 PM." />
      {error && <p role="alert" className="error-text">{error}</p>}
      <button className="primary-button" disabled={saving}>{saving ? "Starting…" : "Start Ingestion"}</button>
    </form></section>;
}
