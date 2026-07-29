import { useMemo } from "react";

const SESSION_KEY = "porter_session_id";

/** Returns a stable anonymous session ID, persisted in localStorage. */
export function useSessionId(): string {
  return useMemo(() => {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;

    const id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
    return id;
  }, []);
}
