import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  useEffect(() => { void supabase.auth.getSession().then(({ data }) => { if (!data.session) location.replace("/staff/login"); else setAuthenticated(true); }); }, []);
  if (!authenticated) return <main className="centered-state" aria-busy="true"><i className="loading-ring" /><p>Checking staff access…</p></main>;
  return children;
}
