import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StakeholderReview from "./StakeholderReview";

describe("StakeholderReview", () => {
  it("offers guest and GM review paths", () => {
    render(<StakeholderReview />);

    expect(screen.getByRole("heading", { name: "See Porter through the eyes of a guest and a GM." })).toBeVisible();
    expect(screen.getByRole("link", { name: /Open guest concierge/ })).toHaveAttribute(
      "href",
      "/atlantis-pilot?review=1",
    );
    expect(screen.getByRole("link", { name: /Open Pulse dashboard/ })).toHaveAttribute("href", "/review/gm");
    expect(screen.getByText("Guest experience is live · GM data is simulated")).toBeVisible();
  });
});
