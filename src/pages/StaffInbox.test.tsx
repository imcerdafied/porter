import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StaffInbox from "./StaffInbox";

const { removeChannel, query } = vi.hoisted(() => {
  const query = { select: vi.fn(), eq: vi.fn(), in: vi.fn(), order: vi.fn(), limit: vi.fn(), maybeSingle: vi.fn(), update: vi.fn() };
  Object.values(query).forEach((method) => method.mockReturnValue(query));
  query.maybeSingle.mockImplementation(() => Promise.resolve({ data: { id: "property-1", name: "Porter House" }, error: null }));
  query.order.mockImplementation(() => Promise.resolve({ data: [], error: null }));
  return { removeChannel: vi.fn(), query };
});

vi.mock("../lib/supabase", () => ({ supabase: {
  from: vi.fn(() => query),
  channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() })),
  removeChannel,
  auth: { signOut: vi.fn() }, functions: { invoke: vi.fn() },
} }));
vi.mock("../lib/analytics", () => ({ logInboxEvent: vi.fn().mockResolvedValue(undefined) }));

describe("Staff inbox", () => {
  beforeEach(() => { window.history.replaceState(null, "", "/staff/inbox"); vi.clearAllMocks(); });
  it("shows a labeled empty active inbox after loading", async () => {
    render(<StaffInbox />);
    expect(await screen.findByRole("heading", { name: "Porter House" })).toBeVisible();
    await waitFor(() => expect(screen.getByText("No active escalations. You’re all caught up.")).toBeVisible());
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
  });
});
