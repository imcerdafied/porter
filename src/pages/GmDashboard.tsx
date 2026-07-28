import { useAuth } from "../hooks/useAuth";
import { useProperty } from "../hooks/useProperty";

export default function GmDashboard() {
  const auth = useAuth(); const { property, loading } = useProperty(auth.user?.id);
  if (auth.loading || loading) return <main className="centered-state" aria-busy="true"><i className="loading-ring" /><p>Loading property…</p></main>;
  if (!auth.user || !property || property.status !== "active") { window.location.replace("/onboarding"); return null; }
  return <main className="centered-state"><p className="eyebrow">Porter dashboard</p><h1>{property.name}</h1><p>Property is active</p><button className="secondary-button" onClick={() => void auth.signOut().then(() => window.location.assign("/onboarding"))}>Sign out</button></main>;
}
