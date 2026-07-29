import { json } from "./http.ts";

export function requireServiceRequest(req: Request) {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const cronSecret = Deno.env.get("PORTER_CRON_SECRET");
  if (!serviceKey || !supabaseUrl) {
    return { response: json({ error: "Service not configured" }, 503) };
  }
  const serviceAuthorized =
    req.headers.get("Authorization") === `Bearer ${serviceKey}`;
  const cronAuthorized = Boolean(
    cronSecret && req.headers.get("x-porter-cron-secret") === cronSecret,
  );
  if (!serviceAuthorized && !cronAuthorized) {
    return { response: json({ error: "Forbidden" }, 403) };
  }
  return { serviceKey, supabaseUrl };
}

export async function sendWhatsAppTemplate(
  phone: string,
  template: string,
  parameters: string[],
) {
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneId) throw new Error("WhatsApp service not configured");
  const response = await fetch(
    `https://graph.facebook.com/v19.0/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: template,
          language: { code: "en_US" },
          components: [{
            type: "body",
            parameters: parameters.map((text) => ({ type: "text", text })),
          }],
        },
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`WhatsApp rejected the message (${response.status})`);
  }
  const body = await response.json();
  return body?.messages?.[0]?.id as string | undefined;
}
