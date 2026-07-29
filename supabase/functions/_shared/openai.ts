const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

type OpenAIContent = {
  type?: string;
  text?: string;
};

type OpenAIOutput = {
  content?: OpenAIContent[];
};

export function openAIOutputText(payload: {
  output_text?: string;
  output?: OpenAIOutput[];
}) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((part) =>
      part.type === "output_text" && typeof part.text === "string"
    )
    ?.text?.trim() ?? "";
}

export async function requestOpenAI(
  apiKey: string,
  input: unknown,
  options: {
    instructions?: string;
    maxOutputTokens?: number;
  } = {},
) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5-mini",
      input,
      instructions: options.instructions,
      max_output_tokens: options.maxOutputTokens ?? 800,
      store: false,
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "OpenAI request failed");
  }
  const text = openAIOutputText(payload);
  if (!text) throw new Error("OpenAI response did not contain text");
  return text;
}
