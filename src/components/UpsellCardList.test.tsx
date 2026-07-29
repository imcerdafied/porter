import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUpsellCards, type UpsellCard } from "../hooks/useUpsellCards";
import { UpsellCardList } from "./UpsellCardList";

vi.mock("../hooks/useSessionId", () => ({ useSessionId: () => "session-1" }));
vi.mock("../hooks/useUpsellCards", () => ({ useUpsellCards: vi.fn() }));
vi.mock("../lib/trackUpsellClick", () => ({ trackUpsellClick: vi.fn() }));

const cards: UpsellCard[] = [
  {
    id: "first",
    property_id: "property-1",
    moment: "spa",
    title: "First offer",
    body: "First body",
    cta_label: "First CTA",
    destination_url: "https://example.com/first",
    display_order: 1,
    attributed_revenue_usd: 20,
  },
  {
    id: "second",
    property_id: "property-1",
    moment: "dining",
    title: "Second offer",
    body: "Second body",
    cta_label: "Second CTA",
    destination_url: "https://example.com/second",
    display_order: 2,
    attributed_revenue_usd: null,
  },
];

describe("UpsellCardList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders active query results in their returned display order", () => {
    vi.mocked(useUpsellCards).mockReturnValue({ cards, loading: false, error: null });
    render(<UpsellCardList propertyId="property-1" />);

    expect(screen.getAllByRole("article").map((article) => article.getAttribute("aria-label")))
      .toEqual(["First offer", "Second offer"]);
  });

  it("renders no offer surface when there are no active cards", () => {
    vi.mocked(useUpsellCards).mockReturnValue({ cards: [], loading: false, error: null });
    const { container } = render(<UpsellCardList propertyId="property-1" />);
    expect(container).toBeEmptyDOMElement();
  });
});
