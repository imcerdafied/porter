import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { handleConciergeMessage } from "../_shared/concierge.ts";
import { escapeXml, optionsResponse } from "../_shared/http.ts";
import { TEMPORARY_FALLBACK } from "../_shared/prompt.ts";
import { verifyTwilioSignature } from "../_shared/signatures.ts";

function twiml(message?: string) {
  const body = message ? `<Message>${escapeXml(message)}</Message>` : "";
  return new Response(`<Response>${body}</Response>`, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const rawBody = await request.text();
    const params = Object.fromEntries(new URLSearchParams(rawBody));
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
    if (!authToken) {
      console.error("TWILIO_AUTH_TOKEN not set");
      return twiml(TEMPORARY_FALLBACK);
    }
    const canonicalUrl = Deno.env.get("TWILIO_WEBHOOK_URL") || request.url;
    const valid = await verifyTwilioSignature(
      authToken,
      canonicalUrl,
      params,
      request.headers.get("x-twilio-signature") ?? "",
    );
    if (!valid) return new Response("Forbidden", { status: 403 });

    const from = params.From;
    const to = params.To;
    const message = params.Body;
    if (!from || !to || !message) return twiml();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: property, error } = await supabase
      .from("properties")
      .select("slug")
      .eq("twilio_number", to)
      .maybeSingle();
    if (error) throw error;
    if (!property) {
      console.error("No property configured for Twilio number");
      return twiml();
    }

    const result = await handleConciergeMessage({
      propertySlug: property.slug,
      threadKey: from,
      channel: "sms",
      message,
    });
    return twiml(result.reply);
  } catch (error) {
    console.error("sms-webhook function error", error);
    return twiml(TEMPORARY_FALLBACK);
  }
});
