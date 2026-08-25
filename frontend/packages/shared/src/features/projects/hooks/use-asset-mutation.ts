import {
  type QueryClient,
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import type { AxiosInstance } from "axios";

import type { AssetDetail } from "./use-asset-detail-query";
import type { Paged } from "../../../schemas/paginated";
import { useApiClient } from "../../../services/api-client-context";
import { assertNever } from "../../../utils/assert-never";
import { projectKeys } from "../query-keys";
import type { KnowledgeTag } from "../schemas/knowledge-tag";
import {
  deleteDeliverable,
  deleteDocument,
  deletePlaybook,
  editDocument,
} from "../services/asset-mutations";
import type { AssetRow } from "../types";

type EditVars = { id: number; name?: string; tagIds: number[] };

// Delete dispatches by asset kind — each category has its own endpoint
// (document / playbook / deliverable), so the row's `type` picks the service.
type RemoveVars = { id: number; type: AssetRow["type"] };

// Snapshot of every rewritten asset-detail entry, so onError restores verbatim.
type EditContext = { snapshot: [readonly unknown[], unknown][] };

export type UseAssetMutationResult = {
  edit: UseMutationResult<number, Error, EditVars, EditContext>;
  remove: UseMutationResult<void, Error, RemoveVars>;
};

// Route a delete to the per-category endpoint. Module-scope (no hooks) so the
// hook body stays short. Switched (not an implicit `else`) with an `assertNever`
// default so adding a 4th asset kind is a compile error here, not a silent
// DELETE to the wrong endpoint — mirrors `runKnowledgeAction`'s exhaustive
// switch.
function removeAsset(
  apiClient: AxiosInstance,
  { id, type }: RemoveVars,
): Promise<void> {
  switch (type) {
    case "knowledge":
      return deleteDocument(apiClient, id);
    case "deliverable":
      return deleteDeliverable(apiClient, id);
    case "experience":
      return deletePlaybook(apiClient, id);
    default:
      return assertNever(type);
  }
}

// Optimistically rewrite the open asset-detail's `tags`, resolving each id to its
// name via the knowledge-tags cache. Module-scope (no hooks) to keep the hook short.
async function optimisticRetag(
  queryClient: QueryClient,
  projectId: number,
  vars: EditVars,
): Promise<EditContext> {
  await queryClient.cancelQueries({ queryKey: projectKeys.assetDetails() });
  const knowledgeTags = queryClient.getQueryData<Paged<KnowledgeTag>>(
    projectKeys.knowledgeTags(projectId),
  );
  const nextTags = vars.tagIds.map((id) => ({
    id,
    name: knowledgeTags?.items.find((tag) => tag.id === id)?.name ?? "",
  }));
  const snapshot = queryClient.getQueriesData({
    queryKey: projectKeys.assetDetails(),
  });
  queryClient.setQueriesData<AssetDetail>(
    { queryKey: projectKeys.assetDetails() },
    (old) =>
      old && old.type === "knowledge" && old.id === vars.id
        ? { ...old, tags: nextTags }
        : old,
  );
  return { snapshot };
}

// Edit (rename + retag) and delete a knowledge document. Retag is OPTIMISTIC —
// the open asset-detail is the rendered source of truth (its panel reads
// `asset.tags`, and the route never remounts it on a param change), so `onMutate`
// rewrites that cache entry for instant feedback. `onError` rolls back;
// `onSettled` invalidates so the 30s staleTime can't serve pre-retag tags.
export function useAssetMutation(projectId: number): UseAssetMutationResult {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const invalidate = (): Promise<void> =>
    queryClient.invalidateQueries({
      queryKey: projectKeys.projectAssets(projectId),
    });

  const edit = useMutation<number, Error, EditVars, EditContext>({
    mutationFn: (vars: EditVars) => editDocument(apiClient, vars),
    onMutate: (vars) => optimisticRetag(queryClient, projectId, vars),
    onError: (_err, _vars, context) => {
      for (const [key, data] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: async () => {
      await Promise.all([
        invalidate(),
        queryClient.invalidateQueries({
          queryKey: projectKeys.assetDetails(),
        }),
      ]);
    },
  });
  const remove = useMutation({
    mutationFn: (vars: RemoveVars) => removeAsset(apiClient, vars),
    onSuccess: invalidate,
  });

  return { edit, remove };
}
