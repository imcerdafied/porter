import { describe, expect, it } from "vitest";
import { buildConversionPayload } from "./useUpsellConversion";

describe("buildConversionPayload", () => {
  it("maps a pre-arrival click to RPC parameters", () => {
    expect(buildConversionPayload({
      deliveryId: "delivery-1", guestSessionId: "stay-1", upsellCatalogId: "card-1",
      propertyId: "property-1", funId: "fun-1", conversionType: "click",
      attributedRevenueUsd: 25, source: "prearrival",
    })).toMatchObject({ p_delivery_id: "delivery-1", p_conversion_type: "click", p_source: "prearrival", p_attributed_revenue_usd: 25 });
  });

  it("allows organic clicks without delivery or stay identifiers", () => {
    const payload = buildConversionPayload({
      deliveryId: null, guestSessionId: null, upsellCatalogId: "card-2", propertyId: "property-1",
      funId: null, conversionType: "click", attributedRevenueUsd: null, source: "inapp",
    });
    expect(payload.p_delivery_id).toBeNull();
    expect(payload.p_guest_session_id).toBeNull();
  });
});
