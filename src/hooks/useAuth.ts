import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { configurationError, supabase } from "../lib/supabase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const unavailable = () => ({ data: { user: null, session: null }, error: new Error(configurationError()!) });
  return {
    user,
    loading,
    signIn: (email: string, password: string) => configurationError()
      ? Promise.resolve(unavailable())
      : supabase.auth.signInWithPassword({ email, password }),
    signUp: (email: string, password: string) => configurationError()
      ? Promise.resolve(unavailable())
      : supabase.auth.signUp({ email, password }),
    signOut: () => supabase.auth.signOut(),
  };
}
