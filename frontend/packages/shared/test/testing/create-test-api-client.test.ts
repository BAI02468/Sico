import { describe, expect, it, vi } from "vitest";

import { createTestApiClient } from "@/testing/create-test-api-client";

describe("createTestApiClient", () => {
  it("uses supplied Axios method overrides", async () => {
    const post = vi.fn().mockResolvedValue({ data: { ok: true } });
    const client = createTestApiClient({ post });

    await client.post("/skills", { name: "Search" });

    expect(post).toHaveBeenCalledWith("/skills", { name: "Search" });
  });
});
