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
      slug: "atlantis-pilot",
      name: "Atlantis Resort",
      logo_url: null,
      accent_color: "#0057b7",
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
});
