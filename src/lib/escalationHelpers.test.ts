import { describe, expect, it } from "vitest";
import { shouldEscalate } from "./escalationHelpers";

describe("shouldEscalate", () => {
  it("escalates confidence below the configured threshold", () => expect(shouldEscalate("Hello", .4, .6, [])).toEqual({ escalate: true, reason: "low_confidence" }));
  it("recognizes an explicit request for a person", () => expect(shouldEscalate("Let me speak to someone", .9, .6, [])).toEqual({ escalate: true, reason: "guest_request" }));
  it("matches configured keywords without case sensitivity", () => expect(shouldEscalate("There is a FIRE upstairs", .9, .6, ["fire"])).toEqual({ escalate: true, reason: "keyword" }));
  it("does not escalate a confident ordinary request", () => expect(shouldEscalate("What time is breakfast?", .9, .6, ["fire"])).toEqual({ escalate: false, reason: null }));
});
