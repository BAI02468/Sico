import {
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";

import { SKILL_DETAIL_QUERY_KEY_PREFIX } from "./use-skill-detail-query";
import { SKILL_STATUS_QUERY_KEY_PREFIX } from "./use-skill-status-query";
import { SKILLS_QUERY_KEY_PREFIX } from "./use-skills-query";
import { useApiClient } from "../../../services/api-client-context";
import type { SkillItem } from "../schemas/skill";
import { uploadSkillAsset } from "../services/asset-upload";
import {
  createSkill,
  deleteSkill,
  type SkillUpdateResult,
  updateSkill,
  type UpdateSkillInput,
} from "../services/skills";

type CreateSkillVariables = {
  agentId: string;
  assetId: number;
  projectId?: number;
};

function invalidateSkillCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  id: number,
): Promise<unknown[]> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: [SKILLS_QUERY_KEY_PREFIX] }),
    queryClient.invalidateQueries({
      queryKey: [SKILL_DETAIL_QUERY_KEY_PREFIX, id],
    }),
    queryClient.invalidateQueries({
      queryKey: [SKILL_STATUS_QUERY_KEY_PREFIX, id],
    }),
  ]);
}

export function useCreateSkillMutation(): UseMutationResult<
  SkillItem,
  Error,
  CreateSkillVariables
> {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSkillVariables) => createSkill(apiClient, input),
    onSettled: () =>
      queryClient.resetQueries({ queryKey: [SKILLS_QUERY_KEY_PREFIX] }),
  });
}

export function useUpdateSkillMutation(): UseMutationResult<
  SkillUpdateResult,
  Error,
  UpdateSkillInput
> {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSkillInput) => updateSkill(apiClient, input),
    onSuccess: (_result, { id }) => invalidateSkillCaches(queryClient, id),
  });
}

export function useDeleteSkillMutation(): UseMutationResult<
  void,
  Error,
  number
> {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteSkill(apiClient, id),
    onSuccess: (_result, id) => invalidateSkillCaches(queryClient, id),
  });
}

export function useUploadSkillAssetMutation(): UseMutationResult<
  number,
  Error,
  File
> {
  const apiClient = useApiClient();
  return useMutation({
    mutationFn: (file: File) => uploadSkillAsset(apiClient, file),
  });
}
