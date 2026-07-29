const HUMAN_REQUESTS = [
  /\b(?:speak|talk) (?:to|with) (?:someone|a person|a human|staff|a manager)\b/i,
  /\b(?:real person|human agent|need a person)\b/i,
];

export type EscalationReason = "low_confidence" | "guest_request" | "keyword" | null;

export function shouldEscalate(content: string, confidence: number, threshold: number, keywords: string[]): { escalate: boolean; reason: EscalationReason } {
  if (confidence < threshold) return { escalate: true, reason: "low_confidence" };
  if (HUMAN_REQUESTS.some((pattern) => pattern.test(content))) return { escalate: true, reason: "guest_request" };
  const normalized = content.toLocaleLowerCase();
  if (keywords.some((keyword) => keyword.trim() && normalized.includes(keyword.trim().toLocaleLowerCase()))) {
    return { escalate: true, reason: "keyword" };
  }
  return { escalate: false, reason: null };
}
