import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { porterApi } from "../lib/api";
import { useChat } from "./useChat";

vi.mock("../lib/api", () => ({
  porterApi: { chat: vi.fn() },
}));

describe("useChat", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(porterApi.chat).mockReset();
  });

  it("accumulates a user message and concierge reply", async () => {
    vi.mocked(porterApi.chat).mockResolvedValue({ reply: "Check-in begins at 4 PM." });
    const { result } = renderHook(() => useChat("atlantis-pilot"));

    await act(() => result.current.sendMessage("When is check-in?"));

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toMatchObject({
      role: "user",
      content: "When is check-in?",
    });
    expect(result.current.messages[1]).toMatchObject({
      role: "assistant",
      content: "Check-in begins at 4 PM.",
    });
    expect(result.current.error).toBeNull();
  });

  it("keeps the user message and shows a warm inline error on failure", async () => {
    vi.mocked(porterApi.chat).mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useChat("atlantis-pilot"));

    await act(() => result.current.sendMessage("Can you help?"));

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.error).toContain("front desk");
    expect(result.current.isLoading).toBe(false);
  });

  it("emits response-time instrumentation after a successful reply", async () => {
    vi.mocked(porterApi.chat).mockResolvedValue({ reply: "Of course." });
    const listener = vi.fn();
    window.addEventListener("porter_chat_reply", listener);
    const { result } = renderHook(() => useChat("atlantis-pilot"));

    await act(() => result.current.sendMessage("Hello"));
    await waitFor(() => expect(listener).toHaveBeenCalledOnce());

    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toMatchObject({
      property_slug: "atlantis-pilot",
      channel: "web",
    });
    expect(event.detail.response_time_ms).toEqual(expect.any(Number));
    window.removeEventListener("porter_chat_reply", listener);
  });
});
