import { describe, expect, it } from "vitest";
import { shouldShowGrowthNudge } from "./usePortfolio";

describe("shouldShowGrowthNudge", () => {
  it.each([[2, true], [1, false], [3, false]])("returns %s for %s properties", (count, expected) => {
    expect(shouldShowGrowthNudge(count)).toBe(expected);
  });
});
