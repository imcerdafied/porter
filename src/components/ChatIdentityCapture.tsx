import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { emitConciergeEvent } from "../lib/emitEvent";

interface Props { onIdentityReady: (funId: string) => void; propertyId?: string; propertySlug?: string; }

function browserId() {
  const key = "porter_browser_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
}

export function ChatIdentityCapture({ onIdentityReady, propertyId, propertySlug }: Props) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const existing = sessionStorage.getItem("porter_fun_id");
    if (existing) { onIdentityReady(existing); return; }
    void supabase.functions.invoke("guest-identity-web", { body: { browser_id: browserId(), property_id: propertyId ?? null, property_slug: propertySlug ?? null } })
      .then(({ data, error: invokeError }) => {
        if (invokeError || !data?.fun_id) throw invokeError ?? new Error("Missing FunID");
        sessionStorage.setItem("porter_fun_id", data.fun_id);
        onIdentityReady(data.fun_id);
      })
      .catch(() => setError("Couldn't start your session. Please try again."));
  }, [onIdentityReady, propertyId, propertySlug]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const funId = sessionStorage.getItem("porter_fun_id");
    if (!funId) { setError("Your session is still starting. Please try again."); return; }
    setSubmitting(true); setError(null);
    const { data, error: invokeError } = await supabase.functions.invoke("guest-optin", { body: { fun_id: funId, opt_in_type: "email", email: email.trim(), channel: "web", property_id: propertyId ?? null } });
    setSubmitting(false);
    if (invokeError || !data?.fun_id) { setError("We couldn't save your email. Please try again."); await emitConciergeEvent("identity_error", { stage: "email_opt_in" }, "web", propertyId); return; }
    sessionStorage.setItem("porter_fun_id", data.fun_id);
    onIdentityReady(data.fun_id);
    setDismissed(true);
  }

  function handleSkip() { setDismissed(true); void emitConciergeEvent("identity_skipped", { stage: "email_capture" }, "web", propertyId); }
  if (dismissed) return null;

  return <form className="identity-capture" onSubmit={handleSubmit} aria-label="Save your conversation">
    <label htmlFor="porter-email">Enter your email to save your conversation (optional)</label>
    <div className="identity-capture__row">
      <input id="porter-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required aria-describedby={error ? "identity-error" : undefined} />
      <button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save"}</button>
      <button type="button" className="identity-capture__skip" onClick={handleSkip} disabled={submitting}>Skip</button>
    </div>
    {error && <p id="identity-error" className="identity-capture__error" role="alert">{error}</p>}
  </form>;
}
