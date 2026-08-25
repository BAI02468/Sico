import { describe, expect, it, vi } from "vitest";

import { uploadSkillAsset } from "@/features/skill/services/asset-upload";
import { makeOkEnvelope } from "@/schemas/api";
import { createTestApiClient } from "@/testing/create-test-api-client";

describe("uploadSkillAsset", () => {
  it("posts the file as multipart and returns the asset id", async () => {
    const post = vi
      .fn()
      .mockResolvedValue({ data: makeOkEnvelope({ id: 42 }) });
    const apiClient = createTestApiClient({ post });
    const file = new File(["x"], "skill.md", { type: "text/markdown" });

    const id = await uploadSkillAsset(apiClient, file);

    expect(id).toBe(42);
    const [url, body] = post.mock.calls[0]!;
    expect(url).toBe("/project/asset");
    expect(body).toBeInstanceOf(FormData);
  });

  it("throws on a non-OK envelope", async () => {
    const post = vi.fn().mockResolvedValue({ data: { code: 7, msg: "fail" } });
    const apiClient = createTestApiClient({ post });
    await expect(
      uploadSkillAsset(apiClient, new File(["x"], "a.md")),
    ).rejects.toThrow();
  });
});
