import { describe, expect, it } from "vitest";
import { parseKbEntries } from "./parseKbEntries";

describe("parseKbEntries", () => {
  it("parses clean JSON and markdown fenced JSON", () => {
    const expected = [{ title: "Check-in", body: "3 PM" }];
    expect(parseKbEntries(JSON.stringify(expected))).toEqual(expected);
    expect(parseKbEntries(`\`\`\`json\n${JSON.stringify(expected)}\n\`\`\``)).toEqual(expected);
  });
  it("rejects malformed and incorrectly shaped values", () => {
    expect(parseKbEntries("not json")).toEqual([]);
    expect(parseKbEntries("")).toEqual([]);
    expect(parseKbEntries('[{"title":1,"body":"ok"}]')).toEqual([]);
  });
});
