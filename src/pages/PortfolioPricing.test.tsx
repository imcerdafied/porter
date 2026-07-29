import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PortfolioPricing from "./PortfolioPricing";

const mockState = vi.hoisted(() => ({ pricing_tier: "starter", propertyCount: 2 }));
vi.mock("../hooks/usePortfolio", async (original) => {
  const actual = await original<typeof import("../hooks/usePortfolio")>();
  return { ...actual, usePortfolio: () => ({ loading: false, portfolio: { id: "portfolio-1", name: "Porter Group", pricing_tier: mockState.pricing_tier }, properties: Array.from({ length: mockState.propertyCount }, (_, index) => ({ property_id: String(index) })) }) };
});

describe("Portfolio pricing", () => {
  it("shows the Growth nudge at exactly two properties", () => {
    mockState.pricing_tier = "starter"; mockState.propertyCount = 2; render(<PortfolioPricing />);
    expect(screen.getByText("Add 1 more property to unlock Growth pricing — 15% off per property")).toBeVisible();
  });
  it("highlights Growth without a nudge after the threshold", () => {
    mockState.pricing_tier = "growth"; mockState.propertyCount = 4; render(<PortfolioPricing />);
    expect(screen.getByRole("row", { name: /Growth/ })).toHaveAttribute("aria-current", "true");
    expect(screen.queryByText(/Add 1 more property/)).not.toBeInTheDocument();
  });
});
