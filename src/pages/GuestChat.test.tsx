import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { porterApi } from "../lib/api";
import GuestChat from "./GuestChat";

vi.mock("../lib/api", () => ({
  porterApi: {
    propertyConfig: vi.fn(),
    chat: vi.fn(),
  },
}));

function renderGuestChat() {
  return render(<GuestChat slug="atlantis-pilot" />);
}

describe("GuestChat", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(porterApi.propertyConfig).mockResolvedValue({
      id: "property-1",
      slug: "atlantis-pilot",
      name: "Atlantis Resort",
      logo_url: null,
      accent_color: "#0057b7",
      wayfinding_enabled: false,
      phunware_building_id: null,
    });
    vi.mocked(porterApi.chat).mockReset();
  });

  it("renders an accessible property chat", async () => {
    renderGuestChat();
    expect(await screen.findByRole("heading", { name: "Atlantis Resort" })).toBeVisible();
    expect(screen.getByRole("log")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByLabelText("Type your message")).toBeEnabled();
    expect(screen.getByLabelText("Send message")).toBeDisabled();
  });

  it("shows a typing indicator while awaiting the reply", async () => {
    vi.mocked(porterApi.chat).mockImplementation(() => new Promise(() => undefined));
    renderGuestChat();
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("Type your message"), "Pool hours?");
    await user.click(screen.getByLabelText("Send message"));

    expect(screen.getByLabelText("Concierge is typing")).toBeVisible();
  });

  it("offers guided scenarios in stakeholder review mode", async () => {
    window.history.replaceState({}, "", "/atlantis-pilot?review=1");
    vi.mocked(porterApi.chat).mockResolvedValue({ reply: "The pool is open until 10 PM." });
    renderGuestChat();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "When does the pool close?" }));

    expect(await screen.findByText("The pool is open until 10 PM.")).toBeVisible();
    expect(screen.getByRole("link", { name: "← Review hub" })).toHaveAttribute("href", "/review");
  });
});
