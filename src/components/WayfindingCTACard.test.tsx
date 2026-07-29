import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WayfindingCTACard } from "./WayfindingCTACard";

vi.mock("../lib/analytics", () => ({ trackEvent: vi.fn() }));

describe("WayfindingCTACard", () => {
  it("shows directions fallback and never mounts an iframe when disabled", () => {
    render(<WayfindingCTACard propertyId="property-1" wayfindingEnabled={false} buildingId="building-1" />);
    expect(screen.getByRole("note")).toHaveTextContent(/ask the front desk/i);
    expect(screen.queryByTitle("Property indoor map")).not.toBeInTheDocument();
  });

  it("opens and closes the configured map with mouse and keyboard", () => {
    render(<WayfindingCTACard propertyId="property-1" wayfindingEnabled buildingId="building/1" />);
    fireEvent.click(screen.getByRole("button", { name: "Open property wayfinding map" }));
    expect(screen.getByTitle("Property indoor map")).toHaveAttribute("src", "https://maps.phunware.com/v3/building%2F1");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
