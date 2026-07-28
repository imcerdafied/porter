import { useState } from "react";
import { StepGoLive } from "../components/wizard/StepGoLive";
import { StepIngestionStatus } from "../components/wizard/StepIngestionStatus";
import { StepKbReview } from "../components/wizard/StepKbReview";
import { StepPropertyInfo } from "../components/wizard/StepPropertyInfo";
import { StepSourceIngestion } from "../components/wizard/StepSourceIngestion";
import { useAuth } from "../hooks/useAuth";
import { useIngestionSources } from "../hooks/useIngestionSources";
import { useKnowledgeEntries } from "../hooks/useKnowledgeEntries";
import { useProperty } from "../hooks/useProperty";
import { isWizardStale } from "../lib/wizardTimeGuard";

function AuthForm() {
  const { signIn, signUp } = useAuth(); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [mode, setMode] = useState<"signup" | "signin">("signup"); const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent) { event.preventDefault(); if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Please enter a valid email address."); if (password.length < 8) return setError("Password must be at least 8 characters."); setLoading(true); setError(""); const { data, error: authError } = mode === "signup" ? await signUp(email, password) : await signIn(email, password); setLoading(false); if (authError) return setError(authError.message); if (mode === "signup" && !data.session) setMessage("Check your email to confirm your account, then sign in."); }
  return <main className="wizard-shell"><div className="wizard-card auth-card"><p className="eyebrow">Porter setup</p><h1>{mode === "signup" ? "Create your GM account" : "Welcome back"}</h1><form className="wizard-form" onSubmit={submit} noValidate><label htmlFor="auth-email">Email</label><input id="auth-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /><label htmlFor="auth-password">Password</label><input id="auth-password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} />{error && <p role="alert" className="error-text">{error}</p>}{message && <p role="status" className="success-text">{message}</p>}<button className="primary-button" disabled={loading}>{loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button></form><button className="text-button" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); }}>{mode === "signup" ? "Already have an account? Sign in" : "New to Porter? Create an account"}</button></div></main>;
}

export default function OnboardingWizard() {
  const auth = useAuth(); const propertyState = useProperty(auth.user?.id); const sourcesState = useIngestionSources(propertyState.property?.id); const entriesState = useKnowledgeEntries(propertyState.property?.id); const [activationError, setActivationError] = useState(""); const [activating, setActivating] = useState(false);
  if (auth.loading || (auth.user && propertyState.loading)) return <main className="centered-state" aria-busy="true"><i className="loading-ring" /><p>Loading your setup…</p></main>;
  if (!auth.user) return <AuthForm />;
  const property = propertyState.property; const step = property?.wizard_step ?? 1;
  if (property?.status === "active") { window.location.replace("/dashboard"); return null; }
  async function activate() { setActivating(true); setActivationError(""); try { await propertyState.activateProperty(); window.location.assign("/dashboard"); } catch (err) { setActivationError(err instanceof Error ? err.message : "Could not activate Porter."); setActivating(false); } }
  return <main className="wizard-shell"><div className="wizard-card"><header className="wizard-header"><div><p className="eyebrow">Porter setup</p><p>Step {step} of 5</p></div><button className="text-button" onClick={() => void auth.signOut()}>Sign out</button></header><div className="wizard-progress" role="progressbar" aria-label="Onboarding progress" aria-valuenow={step} aria-valuemin={1} aria-valuemax={5}><i style={{ width: `${step * 20}%` }} /></div>
    {property && isWizardStale(property.wizard_started_at) && <p className="time-banner">You&apos;re 3.5 hours in — nearly there. Finish reviewing and activate to stay on track.</p>}
    {propertyState.error && <p role="alert" className="error-text">{propertyState.error}</p>}
    {step === 1 && <StepPropertyInfo property={property} onSubmit={propertyState.upsertProperty} />}
    {step === 2 && <StepSourceIngestion onSubmit={async (input) => { await sourcesState.addSources(input); await propertyState.advanceStep(3, "ingesting"); }} />}
    {step === 3 && <StepIngestionStatus sources={sourcesState.sources} loading={sourcesState.loading} onContinue={() => propertyState.advanceStep(4, "review")} />}
    {step === 4 && <StepKbReview entries={entriesState.entries} loading={entriesState.loading} onUpdate={entriesState.updateEntry} onAdd={entriesState.addEntry} onContinue={() => propertyState.advanceStep(5)} />}
    {step === 5 && property && <StepGoLive propertyName={property.name} approvedCount={entriesState.entries.filter((entry) => entry.status === "approved").length} sourcesCount={sourcesState.sources.filter((source) => source.status === "done").length} saving={activating} error={activationError} onActivate={activate} />}
  </div></main>;
}
