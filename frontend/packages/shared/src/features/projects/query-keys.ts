import type { MemberType } from "./schemas/project";
import type { AssetCategory, AssetRow } from "./types";

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => ["projects", "list"] as const,
  list: ({
    memberType,
    pageSize,
  }: {
    memberType: MemberType;
    pageSize: number;
  }) => ["projects", "list", { memberType, pageSize }] as const,
  details: () => ["projects", "detail"] as const,
  detail: (id: number) => ["projects", "detail", id] as const,
  assetLists: () => ["projects", "assets"] as const,
  projectAssets: (id: number) => ["projects", "assets", id] as const,
  assetList: (id: number, category: AssetCategory) =>
    ["projects", "assets", id, category] as const,
  assetDetails: () => ["projects", "asset-detail"] as const,
  assetDetail: (type: AssetRow["type"], id: number) =>
    ["projects", "asset-detail", type, id] as const,
  knowledgeTags: (id: number) => ["projects", "knowledge-tags", id] as const,
};
