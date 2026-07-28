import { describe, expect, it } from "vitest";
import { isWizardStale } from "./wizardTimeGuard";

describe("isWizardStale", () => {
  const now = new Date("2026-07-28T12:00:00Z").getTime();
  it("is false at one hour", () => expect(isWizardStale("2026-07-28T11:00:00Z", now)).toBe(false));
  it("is true at four hours", () => expect(isWizardStale("2026-07-28T08:00:00Z", now)).toBe(true));
  it("is false for an invalid timestamp", () => expect(isWizardStale("invalid", now)).toBe(false));
});
