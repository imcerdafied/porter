import { describe, expect, it } from "vitest";
import { buildDeploymentRows } from "./useKnowledgeTemplates";

describe("buildDeploymentRows", () => {
  it("builds one deployment per property", () => {
    expect(buildDeploymentRows("template-1", ["property-1", "property-2"], "user-1")).toEqual([
      { template_id: "template-1", property_id: "property-1", deployed_by: "user-1" },
      { template_id: "template-1", property_id: "property-2", deployed_by: "user-1" },
    ]);
  });
});
