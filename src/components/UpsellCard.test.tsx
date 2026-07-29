import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UpsellCard as UpsellCardType } from "../hooks/useUpsellCards";
import { trackUpsellClick } from "../lib/trackUpsellClick";
import { UpsellCard } from "./UpsellCard";

vi.mock("../lib/trackUpsellClick", () => ({ trackUpsellClick: vi.fn() }));

const card: UpsellCardType = {
  id: "card-1",
  property_id: "property-1",
  moment: "late_checkout",
  title: "Stay a little longer",
  body: "Extend your stay until 2 PM.",
  cta_label: "Request Late Checkout",
  destination_url: "https://example.com/late-checkout",
  display_order: 1,
  attributed_revenue_usd: 25,
};

describe("UpsellCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders accessible property-configured content and the moment accent", () => {
    const { container } = render(<UpsellCard card={card} sessionId="session-1" />);
    expect(screen.getByRole("article", { name: card.title })).toBeVisible();
    expect(screen.getByText(card.body)).toBeVisible();
    expect(screen.getByRole("button", { name: `${card.cta_label} — ${card.title}` })).toBeVisible();
    expect(container.querySelector(".upsell-card--late_checkout")).toBeTruthy();
  });

  it("tracks and opens immediately without waiting for the write", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<UpsellCard card={card} sessionId="session-1" />);

    fireEvent.click(screen.getByRole("button"));

    expect(trackUpsellClick).toHaveBeenCalledWith(card, "session-1");
    expect(open).toHaveBeenCalledWith(card.destination_url, "_blank", "noopener,noreferrer");
  });
});
