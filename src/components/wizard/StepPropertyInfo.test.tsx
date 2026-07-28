import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { StepPropertyInfo } from "./StepPropertyInfo";

it("shows an inline error when submitted without a property name", async () => {
  render(<StepPropertyInfo property={null} onSubmit={vi.fn()} />);
  await userEvent.click(screen.getByRole("button", { name: "Continue →" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Please enter your property name.");
});
