const WAYFINDING_KEYWORDS = [
  "directions", "where is", "how do i get to", "find the", "map", "floor",
  "pool", "gym", "restaurant", "elevator", "lobby",
] as const;

export function detectWayfindingIntent(message: string): boolean {
  const normalized = message.toLocaleLowerCase();
  return WAYFINDING_KEYWORDS.some((keyword) => normalized.includes(keyword));
}
