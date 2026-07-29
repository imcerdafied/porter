import { useCallback, useMemo, useState } from "react";
import { porterApi } from "../lib/api";
import type { ChatMessage } from "../types";
import { emitConciergeEvent } from "../lib/emitEvent";

const CHAT_ERROR = "I'm having a moment — please try again or ask at the front desk.";

function getThreadKey(slug: string) {
  const storageKey = `porter:${slug}:thread`;
  const existing = sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const created = crypto.randomUUID();
  sessionStorage.setItem(storageKey, created);
  return created;
}

export function useChat(propertySlug: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadKey = useMemo(() => getThreadKey(propertySlug), [propertySlug]);

  const sendMessage = useCallback(async (rawMessage: string) => {
    const content = rawMessage.trim();
    if (!content || isLoading) return false;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };
    setMessages((current) => [...current, userMessage]);
    setError(null);
    setIsLoading(true);
    const startedAt = performance.now();

    try {
      const result = await porterApi.chat({
        property_slug: propertySlug,
        thread_key: threadKey,
        channel: "web",
        message: content,
        fun_id: sessionStorage.getItem("porter_fun_id") ?? undefined,
      });
      void emitConciergeEvent("question", { response_time_ms: Math.round(performance.now() - startedAt) }, "web");
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.reply,
        },
      ]);
      window.dispatchEvent(
        new CustomEvent("porter_chat_reply", {
          detail: {
            property_slug: propertySlug,
            channel: "web",
            response_time_ms: Math.round(performance.now() - startedAt),
          },
        }),
      );
      return true;
    } catch (cause) {
      console.error("Porter chat failed", cause);
      setError(CHAT_ERROR);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, propertySlug, threadKey]);

  return { messages, isLoading, error, sendMessage };
}
