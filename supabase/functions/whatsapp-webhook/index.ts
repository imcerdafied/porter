import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { handleConciergeMessage } from "../_shared/concierge.ts";
import { CORS_HEADERS, optionsResponse } from "../_shared/http.ts";
import { TEMPORARY_FALLBACK } from "../_shared/prompt.ts";
import { verifyMetaSignature } from "../_shared/signatures.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();

  const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "";
  if (request.method === "GET") {
    const url = new URL(request.url);
    const valid = Boolean(verifyToken) &&
      url.searchParams.get("hub.mode") === "subscribe" &&
      url.searchParams.get("hub.verify_token") === verifyToken;
    return valid
      ? new Response(url.searchParams.get("hub.challenge") ?? "", {
        headers: CORS_HEADERS,
      })
      : new Response("Forbidden", { status: 403, headers: CORS_HEADERS });
  }
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  try {
    const appSecret = Deno.env.get("WHATSAPP_APP_SECRET") ?? "";
    const rawBody = await request.text();
    if (!appSecret) {
      console.error("WHATSAPP_APP_SECRET not set");
      return new Response("Webhook is not configured", { status: 503 });
    }
    if (
      !(await verifyMetaSignature(
        rawBody,
        request.headers.get("x-hub-signature-256"),
        appSecret,
      ))
    ) {
      return new Response("Forbidden", { status: 403 });
    }

    const payload = JSON.parse(rawBody);
    const change = payload?.entry?.[0]?.changes?.[0];
    const message = change?.value?.messages?.[0];
    if (!message || message.type !== "text") return new Response("OK");

    const phoneNumberId = String(
      change?.value?.metadata?.phone_number_id ?? "",
    );
    const from = String(message.from ?? "");
    const userText = String(message.text?.body ?? "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: property, error } = await supabase
      .from("properties")
      .select("slug")
      .eq("whatsapp_phone_number_id", phoneNumberId)
      .maybeSingle();
    if (error) throw error;
    if (!property) {
      console.error("No property configured for WhatsApp phone number");
      return new Response("OK");
    }

    const result = await handleConciergeMessage({
      propertySlug: property.slug,
      threadKey: from,
      channel: "whatsapp",
      message: userText,
    });
    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    if (!accessToken) {
      console.error("WHATSAPP_ACCESS_TOKEN not set");
      return new Response("Messaging is not configured", { status: 503 });
    }
    const sendResponse = await fetch(
      `https://graph.facebook.com/v23.0/${
        encodeURIComponent(phoneNumberId)
      }/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: from,
          type: "text",
          text: { body: /^yes\b/i.test(userText.trim()) ? `Thanks — Porter will remember you across visits.\n\n${result.reply}` : `${result.reply}\n\nReply YES to let Porter remember you across visits.` },
        }),
      },
    );
    if (!sendResponse.ok) {
      throw new Error(`WhatsApp send failed with ${sendResponse.status}`);
    }
    return new Response("OK");
  } catch (error) {
    console.error("whatsapp-webhook function error", error);
    return new Response(TEMPORARY_FALLBACK, { status: 500 });
  }
});
