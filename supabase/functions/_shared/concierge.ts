import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import {
  buildSystemPrompt,
  CONNECTION_FALLBACK,
  HEDGE_PHRASE,
  TEMPORARY_FALLBACK,
} from "./prompt.ts";

export type Channel = "web" | "whatsapp" | "sms";

interface ConciergeInput {
  propertySlug: string;
  threadKey: string;
  channel: Channel;
  message: string;
}

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

interface Property {
  id: string;
  name: string;
  knowledge_base: string;
  escalation_confidence_threshold: number;
  escalation_keywords: string[];
}

const HUMAN_REQUESTS = [/\b(?:speak|talk) (?:to|with) (?:someone|a person|a human|staff|a manager)\b/i, /\b(?:real person|human agent|need a person)\b/i];

function escalationReason(message: string, keywords: string[]) {
  if (HUMAN_REQUESTS.some((pattern) => pattern.test(message))) return "guest_request";
  const normalized = message.toLocaleLowerCase();
  return keywords.some((keyword) => keyword.trim() && normalized.includes(keyword.trim().toLocaleLowerCase())) ? "keyword" : null;
}

export class ConciergeInputError extends Error {}
export class PropertyNotFoundError extends Error {}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function validateInput(input: ConciergeInput) {
  if (!input.propertySlug || !input.threadKey || !input.message.trim()) {
    throw new ConciergeInputError(
      "property_slug, thread_key, channel, and message are required",
    );
  }
  if (!["web", "whatsapp", "sms"].includes(input.channel)) {
    throw new ConciergeInputError("Unsupported channel");
  }
  if (input.threadKey.length > 180 || input.message.length > 4000) {
    throw new ConciergeInputError("Message or thread is too long");
  }
}

export async function handleConciergeMessage(input: ConciergeInput) {
  validateInput(input);
  const startedAt = performance.now();
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

  const supabase = createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id,name,knowledge_base,escalation_confidence_threshold,escalation_keywords")
    .eq("slug", input.propertySlug)
    .maybeSingle<Property>();

  if (propertyError) throw propertyError;
  if (!property) throw new PropertyNotFoundError("Property not found");

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .upsert(
      {
        property_id: property.id,
        channel: input.channel,
        thread_key: input.threadKey,
      },
      { onConflict: "property_id,channel,thread_key" },
    )
    .select("id")
    .single();

  if (conversationError || !conversation) {
    throw conversationError ?? new Error("Could not create conversation");
  }
  const conversationId = conversation.id;

  const { data: latestHistory, error: historyError } = await supabase
    .from("messages")
    .select("role,content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (historyError) throw historyError;
  const history = ((latestHistory ?? []) as HistoryMessage[]).reverse();

  const { error: userInsertError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: input.message.trim(),
    escalation_flag: false,
  });
  if (userInsertError) throw userInsertError;

  async function createEscalation(reason: string) {
    const response = await fetch(`${requiredEnv("SUPABASE_URL")}/functions/v1/escalate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${requiredEnv("SUPABASE_SERVICE_ROLE_KEY")}`, apikey: requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: conversationId, reason }),
    });
    if (!response.ok) console.error("Escalation creation failed", response.status, await response.text());
  }

  const immediateReason = escalationReason(input.message, property.escalation_keywords ?? []);
  if (immediateReason) await createEscalation(immediateReason);

  async function persistAssistant(reply: string, escalationFlag: boolean) {
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: reply,
      escalation_flag: escalationFlag,
    });
    if (error) throw error;
    const durationMs = Math.round(performance.now() - startedAt);
    console.log(JSON.stringify({
      event: "chat_reply",
      property_slug: input.propertySlug,
      channel: input.channel,
      duration_ms: durationMs,
    }));
    if (escalationFlag && !immediateReason) await createEscalation("ai_handoff");
    return {
      reply,
      conversation_id: conversationId,
      escalation_flag: escalationFlag,
      duration_ms: durationMs,
    };
  }

  if (!anthropicKey) {
    console.error("ANTHROPIC_API_KEY not set");
    return await persistAssistant(CONNECTION_FALLBACK, true);
  }

  const anthropicResponse = await fetch(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        temperature: 0,
        system: buildSystemPrompt(property.name, property.knowledge_base),
        messages: [
          ...history,
          { role: "user", content: input.message.trim() },
        ],
      }),
    },
  );

  if (!anthropicResponse.ok) {
    console.error(
      "Anthropic request failed",
      anthropicResponse.status,
      await anthropicResponse.text(),
    );
    return await persistAssistant(TEMPORARY_FALLBACK, true);
  }

  const payload = await anthropicResponse.json();
  const reply = payload?.content?.find(
    (part: { type?: string; text?: string }) =>
      part.type === "text" && typeof part.text === "string",
  )?.text?.trim();

  if (!reply) {
    console.error("Anthropic response did not contain text");
    return await persistAssistant(TEMPORARY_FALLBACK, true);
  }

  const escalationFlag = reply.includes(HEDGE_PHRASE);
  return await persistAssistant(reply, escalationFlag);
}
