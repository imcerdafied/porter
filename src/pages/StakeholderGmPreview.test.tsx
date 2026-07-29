import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import StakeholderGmPreview from "./StakeholderGmPreview";

describe("StakeholderGmPreview", () => {
  it("is clearly simulated and lets reviewers change the reporting window", async () => {
    render(<StakeholderGmPreview />);
    const user = userEvent.setup();

    expect(screen.getByText("Simulated pilot data · No guest information")).toBeVisible();
    expect(screen.getByLabelText("Revenue intent surfaced")).toHaveTextContent("$18,400.00");

    await user.click(screen.getByRole("button", { name: "Last 7 days" }));

    expect(screen.getByLabelText("Revenue intent surfaced")).toHaveTextContent("$4,210.00");
    expect(screen.getByText("472")).toBeVisible();
  });
});
