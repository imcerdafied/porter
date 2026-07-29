import { describe, expect, it } from "vitest";
import { detectWayfindingIntent } from "./useWayfindingIntent";

describe("detectWayfindingIntent", () => {
  it("detects navigation language case-insensitively", () => {
    expect(detectWayfindingIntent("Where is the pool? ")).toBe(true);
    expect(detectWayfindingIntent("HOW DO I GET TO THE GYM?")).toBe(true);
    expect(detectWayfindingIntent("Find the elevator")).toBe(true);
  });

  it("ignores unrelated requests", () => {
    expect(detectWayfindingIntent("What time is checkout?")).toBe(false);
    expect(detectWayfindingIntent("Could I get extra towels?")).toBe(false);
  });
});
