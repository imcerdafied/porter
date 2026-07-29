import {
  type Channel,
  ConciergeInputError,
  handleConciergeMessage,
  PropertyNotFoundError,
} from "../_shared/concierge.ts";
import { json, optionsResponse } from "../_shared/http.ts";
import { TEMPORARY_FALLBACK } from "../_shared/prompt.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await request.json();
    const result = await handleConciergeMessage({
      propertySlug: String(body.property_slug ?? ""),
      threadKey: String(body.thread_key ?? ""),
      channel: String(body.channel ?? "") as Channel,
      message: String(body.message ?? ""),
      funId: body.fun_id ? String(body.fun_id) : undefined,
    });
    return json(result);
  } catch (error) {
    if (error instanceof ConciergeInputError) {
      return json({ error: error.message }, 400);
    }
    if (error instanceof PropertyNotFoundError) {
      return json({ error: error.message }, 404);
    }
    console.error("chat function error", error);
    return json({ reply: TEMPORARY_FALLBACK }, 200);
  }
});
