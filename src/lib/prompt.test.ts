import { describe, expect, it } from "vitest";
import {
  buildSystemPrompt,
  HEDGE_PHRASE,
} from "../../supabase/functions/_shared/prompt";

describe("buildSystemPrompt", () => {
  it("single-sources the required hedge phrase when the knowledge base is empty", () => {
    const prompt = buildSystemPrompt("Atlantis Resort", "");
    expect(prompt).toContain(HEDGE_PHRASE);
    expect(prompt).toContain("Refer every question to the hotel team");
  });

  it("includes property identity and supplied facts", () => {
    const prompt = buildSystemPrompt("Atlantis Resort", "Pool closes at 10 PM.");
    expect(prompt).toContain("Atlantis Resort");
    expect(prompt).toContain("Pool closes at 10 PM.");
  });
});
