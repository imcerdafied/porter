import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import StaffLogin from "./StaffLogin";

vi.mock("../lib/supabase", () => ({ configurationError: () => null, supabase: { auth: { signInWithPassword: vi.fn().mockResolvedValue({ error: new Error("Invalid credentials") }) } } }));
vi.mock("../lib/analytics", () => ({ logInboxEvent: vi.fn() }));

describe("Staff login", () => {
  it("shows wrong credentials as inline accessible text", async () => {
    render(<StaffLogin />); const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "staff@example.com"); await user.type(screen.getByLabelText("Password"), "wrong-password"); await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is incorrect. Try again.");
  });
});
