import { describe, expect, it, vi } from "vitest";
import { supabase } from "./supabase";
import { emitConciergeEvent } from "./emitEvent";
vi.mock("./supabase", () => ({ supabase: { functions: { invoke: vi.fn() } } }));
describe("emitConciergeEvent", () => {
  it("does not write before identity is ready", async () => {
    sessionStorage.clear(); await emitConciergeEvent("question", { topic: "hours" }, "web");
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });
});

