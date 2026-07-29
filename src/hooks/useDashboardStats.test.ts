import { describe, expect, it } from "vitest";
import { isDateRange, sinceFromRange } from "./useDashboardStats";

describe("dashboard date ranges", () => {
  const now = new Date("2026-07-29T12:00:00.000Z");
  it("calculates stable UTC boundaries", () => {
    expect(sinceFromRange("7d", now)).toBe("2026-07-22T12:00:00.000Z");
    expect(sinceFromRange("30d", now)).toBe("2026-06-29T12:00:00.000Z");
    expect(sinceFromRange("all", now)).toBe("1970-01-01T00:00:00.000Z");
  });
  it("rejects unsupported URL values", () => {
    expect(isDateRange("7d")).toBe(true);
    expect(isDateRange("quarter")).toBe(false);
    expect(isDateRange(null)).toBe(false);
  });
});
