import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useSkillCardEdits } from "@/features/skill/hooks/use-skill-card-edits";

const versionOne = {
  id: 1,
  skillId: 1,
  version: "v1",
  name: "Search",
  description: "",
  assetId: 1,
  url: "",
  creatorUsername: "",
  failReason: "",
  createdAt: 1,
  updatedAt: 1,
  files: [],
  actions: [],
};

const versionTwo = {
  ...versionOne,
  id: 2,
  version: "v2",
};

describe("useSkillCardEdits", () => {
  it("preserves newer local edits when the server version advances", () => {
    const firstFiles = [{ path: "SKILL.md", content: "# first" }];
    const secondFiles = [{ path: "SKILL.md", content: "# second" }];
    const { result, rerender } = renderHook(
      ({ files, activeVersion }) => useSkillCardEdits(files, activeVersion),
      { initialProps: { files: firstFiles, activeVersion: versionOne } },
    );

    act(() => {
      result.current.onContentChange("SKILL.md", "# edited");
    });
    expect(result.current.hasChanges).toBe(true);

    rerender({ files: secondFiles, activeVersion: versionTwo });

    expect(result.current.files).toEqual([
      { path: "SKILL.md", content: "# edited" },
    ]);
    expect(result.current.changedFiles).toEqual([
      { path: "SKILL.md", content: "# edited" },
    ]);
    expect(result.current.hasChanges).toBe(true);
  });
});
