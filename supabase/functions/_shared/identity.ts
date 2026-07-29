import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

export async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function findIdentity(db: SupabaseClient, channel: "web" | "whatsapp" | "sms", identifier: string, propertyId: string | null) {
  const hash = await sha256(identifier);
  const { data, error } = await db.rpc("upsert_guest_identity", {
    p_channel: channel,
    p_phone_hash: channel === "web" ? null : hash,
    p_email: null,
    p_property_id: propertyId,
    p_browser_hash: channel === "web" ? hash : null,
  });
  if (error || !data) throw error ?? new Error("Identity creation failed");
  return String(data);
}

