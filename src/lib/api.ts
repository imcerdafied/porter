import type { AdminProperty, PropertyConfig } from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export class PorterApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "PorterApiError";
  }
}

async function invoke<T>(name: string, body: unknown): Promise<T> {
  if (!supabaseUrl || !publishableKey) {
    throw new PorterApiError("Porter has not been connected to its property service.");
  }
  const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new PorterApiError(
      payload.error || "The concierge service is unavailable.",
      response.status,
    );
  }
  return payload as T;
}

export const porterApi = {
  async propertyConfig(slug: string) {
    const result = await invoke<{ property: PropertyConfig }>("property-config", { slug });
    return result.property;
  },
  chat(body: {
    property_slug: string;
    thread_key: string;
    channel: "web";
    message: string;
  }) {
    return invoke<{ reply: string; conversation_id?: string; duration_ms?: number }>(
      "chat",
      body,
    );
  },
  async adminProperty(body: {
    slug: string;
    token: string;
    action: "read" | "update";
    knowledge_base?: string;
    accent_color?: string;
    logo_url?: string;
  }) {
    const result = await invoke<{ property: AdminProperty }>("admin-property", body);
    return result.property;
  },
};
