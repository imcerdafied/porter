export interface ParsedKbEntry { title: string; body: string }

export function parseKbEntries(raw: string): ParsedKbEntry[] {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed: unknown = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is ParsedKbEntry =>
      typeof entry === "object" && entry !== null &&
      typeof (entry as ParsedKbEntry).title === "string" &&
      typeof (entry as ParsedKbEntry).body === "string",
    );
  } catch {
    return [];
  }
}
