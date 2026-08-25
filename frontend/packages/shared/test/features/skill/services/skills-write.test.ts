import { describe, expect, it, vi } from "vitest";

import { SkillStatusSchema } from "@/features/skill/schemas/skill";
import {
  createSkill,
  deleteSkill,
  updateSkill,
} from "@/features/skill/services/skills";
import { makeOkEnvelope } from "@/schemas/api";
import { createTestApiClient } from "@/testing/create-test-api-client";

describe("skills write services", () => {
  it("createSkill posts agentId+assetId and returns the created skill", async () => {
    const post = vi.fn().mockResolvedValue({
      data: makeOkEnvelope({
        skill: {
          id: 9,
          agentId: "a",
          name: "S",
          description: "",
          version: "v1",
          status: 1,
          assetId: 5,
          creatorUsername: "",
          failReason: "",
          projectId: 1,
          createdAt: 1,
          updatedAt: "2",
        },
      }),
    });
    const res = await createSkill(createTestApiClient({ post }), {
      agentId: "a",
      assetId: 5,
    });
    expect(res.id).toBe(9);
    expect(post).toHaveBeenCalledWith("/skills", {
      agentId: "a",
      assetId: 5,
      projectId: undefined,
    });
  });

  it("createSkill accepts an uploading skill with blank metadata", async () => {
    const post = vi.fn().mockResolvedValue({
      data: makeOkEnvelope({
        skill: {
          id: 9,
          agentId: "a",
          name: "",
          description: "",
          version: "",
          status: SkillStatusSchema.enum.UPLOADING,
          assetId: 5,
          projectId: 1,
          createdAt: 1,
        },
      }),
    });

    const result = await createSkill(createTestApiClient({ post }), {
      agentId: "a",
      assetId: 5,
    });

    expect(result.id).toBe(9);
    expect(result.status).toBe(SkillStatusSchema.enum.UPLOADING);
  });

  it("updateSkill puts a new version and returns version metadata", async () => {
    const put = vi.fn().mockResolvedValue({
      data: makeOkEnvelope({
        skillId: 9,
        version: "v2",
        versionId: 101,
        name: "S",
        description: "d",
      }),
    });
    const res = await updateSkill(createTestApiClient({ put }), {
      id: 9,
      currentVersion: "v1",
      files: [{ path: "skill.md", content: "x" }],
    });
    expect(res.version).toBe("v2");
    expect(res.versionId).toBe(101);
  });

  it("deleteSkill resolves on an OK envelope", async () => {
    const del = vi.fn().mockResolvedValue({ data: { code: 0, msg: "ok" } });
    await expect(
      deleteSkill(createTestApiClient({ delete: del }), 9),
    ).resolves.toBeUndefined();
    expect(del).toHaveBeenCalledWith("/skills", { params: { id: 9 } });
  });

  it("deleteSkill throws on a non-OK envelope", async () => {
    const del = vi.fn().mockResolvedValue({ data: { code: 5, msg: "no" } });
    await expect(
      deleteSkill(createTestApiClient({ delete: del }), 9),
    ).rejects.toThrow();
  });
});
