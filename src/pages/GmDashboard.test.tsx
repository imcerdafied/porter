import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GmDashboard from "./GmDashboard";

vi.mock("../hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-1" }, loading: false, signOut: vi.fn() }) }));
vi.mock("../hooks/useProperty", () => ({ useProperty: () => ({ loading: false, property: { id: "property-1", name: "Porter House", status: "active", staff_role: "gm", pilot_report_status: "ready" } }) }));
vi.mock("../hooks/useDashboardStats", async (original) => {
  const actual = await original<typeof import("../hooks/useDashboardStats")>();
  return { ...actual, useDashboardStats: () => ({ totalConversations: null, deflectionRate: null, escalationRate: null, upsellClicks: null, identitiesCaptured: null, attributedRevenue: 1234.5, revenueConfig: null, topIntents: [], loading: false, error: null }) };
});
vi.mock("../lib/analytics", () => ({ logDashboardEvent: vi.fn().mockResolvedValue(undefined), trackEvent: vi.fn() }));
vi.mock("../lib/supabase", () => ({ supabase: { storage: { from: vi.fn() } } }));

describe("GM dashboard", () => {
  beforeEach(() => window.history.replaceState(null, "", "/dashboard"));

  it("shows graceful empty KPI values and the ready report", () => {
    render(<GmDashboard />);
    expect(screen.getByRole("heading", { name: "Porter House" })).toBeVisible();
    expect(screen.getAllByText("—")).toHaveLength(5);
    expect(screen.getByText("$1,234.50")).toBeVisible();
    expect(screen.getByRole("button", { name: "Download Day-30 Report" })).toBeVisible();
  });

  it("updates the selected range and URL without navigation", async () => {
    render(<GmDashboard />);
    await userEvent.click(screen.getByRole("button", { name: "Last 30 days" }));
    expect(screen.getByRole("button", { name: "Last 30 days" })).toHaveAttribute("aria-pressed", "true");
    expect(new URLSearchParams(window.location.search).get("range")).toBe("30d");
  });
});
