import { describe, expect, it, vi } from "vitest";

import { fetchRoles } from "@/features/skill/services/roles";
import { makeOkEnvelope } from "@/schemas/api";
import { createTestApiClient } from "@/testing/create-test-api-client";

describe("fetchRoles", () => {
  it("returns the normalised role array", async () => {
    const get = vi.fn().mockResolvedValue({
      data: makeOkEnvelope({ role: ["Tester"] }),
    });
    const apiClient = createTestApiClient({ get });
    const roles = await fetchRoles(apiClient);
    expect(roles).toEqual([{ name: "Tester", value: "Tester" }]);
    expect(get).toHaveBeenCalledWith("/agent/roles");
  });
});
