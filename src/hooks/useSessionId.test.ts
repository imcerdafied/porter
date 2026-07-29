import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useSessionId } from "./useSessionId";

describe("useSessionId", () => {
  beforeEach(() => localStorage.clear());

  it("generates and stores an anonymous UUID", () => {
    const { result } = renderHook(() => useSessionId());
    expect(result.current).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(localStorage.getItem("porter_session_id")).toBe(result.current);
  });

  it("reuses the persisted ID on subsequent visits", () => {
    localStorage.setItem("porter_session_id", "existing-session");
    const { result } = renderHook(() => useSessionId());
    expect(result.current).toBe("existing-session");
  });
});
