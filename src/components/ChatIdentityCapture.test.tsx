import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "../lib/supabase";
import { ChatIdentityCapture } from "./ChatIdentityCapture";

vi.mock("../lib/supabase", () => ({ supabase: { functions: { invoke: vi.fn() } } }));

describe("ChatIdentityCapture", () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); });
  it("creates an anonymous identity and renders skippable email capture", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({ data: { fun_id: "fun-1" }, error: null } as never);
    const ready = vi.fn(); render(<ChatIdentityCapture onIdentityReady={ready} />);
    expect(screen.getByLabelText(/enter your email/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Skip" })).toBeVisible();
    await waitFor(() => expect(ready).toHaveBeenCalledWith("fun-1"));
    expect(sessionStorage.getItem("porter_fun_id")).toBe("fun-1");
  });
  it("opts in and adopts the canonical FunID", async () => {
    sessionStorage.setItem("porter_fun_id", "temporary");
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({ data: { fun_id: "canonical" }, error: null } as never);
    const ready = vi.fn(); render(<ChatIdentityCapture onIdentityReady={ready} />);
    await userEvent.type(screen.getByLabelText(/enter your email/i), "Guest@Example.com");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(sessionStorage.getItem("porter_fun_id")).toBe("canonical"));
  });
  it("can be dismissed without blocking chat", async () => {
    sessionStorage.setItem("porter_fun_id", "fun-1");
    render(<ChatIdentityCapture onIdentityReady={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(screen.queryByRole("form", { name: /save/i })).not.toBeInTheDocument();
  });
});

