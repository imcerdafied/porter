import { describe, expect, it } from "vitest";
import { accessibleInk, contrastRatio } from "./color";

describe("color accessibility", () => {
  it("confirms the default accent passes AA against white", () => {
    expect(contrastRatio("#1a56db", "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });

  it("chooses readable ink for light and dark accents", () => {
    expect(accessibleInk("#0057b7")).toBe("#ffffff");
    expect(accessibleInk("#f5d46f")).toBe("#111111");
  });
});
