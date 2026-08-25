import { describe, expect, it } from "vitest";

import { projectKeys } from "@/features/projects";

describe("projectKeys", () => {
  it("uses the literal Projects root tuple", () => {
    expect(projectKeys.all).toEqual(["projects"]);
  });

  it("uses the literal Projects list prefix tuple", () => {
    expect(projectKeys.lists()).toEqual(["projects", "list"]);
  });

  it("uses the literal Projects list tuple", () => {
    expect(projectKeys.list({ memberType: 2, pageSize: 30 })).toEqual([
      "projects",
      "list",
      { memberType: 2, pageSize: 30 },
    ]);
  });

  it("uses the literal Project details prefix tuple", () => {
    expect(projectKeys.details()).toEqual(["projects", "detail"]);
  });

  it("uses the literal Project detail tuple", () => {
    expect(projectKeys.detail(7)).toEqual(["projects", "detail", 7]);
  });

  it("uses the literal Project asset lists prefix tuple", () => {
    expect(projectKeys.assetLists()).toEqual(["projects", "assets"]);
  });

  it("uses the literal Project assets tuple", () => {
    expect(projectKeys.projectAssets(7)).toEqual(["projects", "assets", 7]);
  });

  it("uses the literal Project asset list tuple", () => {
    expect(projectKeys.assetList(7, "knowledge")).toEqual([
      "projects",
      "assets",
      7,
      "knowledge",
    ]);
  });

  it("uses the literal Project asset details prefix tuple", () => {
    expect(projectKeys.assetDetails()).toEqual(["projects", "asset-detail"]);
  });

  it("uses the literal Project asset detail tuple", () => {
    expect(projectKeys.assetDetail("deliverable", 11)).toEqual([
      "projects",
      "asset-detail",
      "deliverable",
      11,
    ]);
  });

  it("uses the literal Project knowledge tags tuple", () => {
    expect(projectKeys.knowledgeTags(7)).toEqual([
      "projects",
      "knowledge-tags",
      7,
    ]);
  });
});
