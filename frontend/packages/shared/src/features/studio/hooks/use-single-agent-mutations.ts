import {
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";

import { AGENT_INFOS_QUERY_KEY_PREFIX } from "./use-agent-infos-query";
import { SINGLE_AGENT_QUERY_KEY_PREFIX } from "./use-single-agent-query";
import { STUDIO_AGENTS_QUERY_KEY_PREFIX } from "./use-studio-agents-query";
import { useApiClient } from "../../../services/api-client-context";
import { type PublishSingleAgentSelection } from "../schemas/publish-single-agent";
import { publishSingleAgent } from "../services/publish-single-agent";
import {
  createSingleAgent,
  type CreateSingleAgentInput,
  type CreateSingleAgentResult,
  deleteSingleAgent,
  updateSingleAgent,
  type UpdateSingleAgentInput,
} from "../services/single-agent-mutations";

// Create/update invalidate the Studio list (single_agent_infos) so a new or
// renamed worker shows up without a manual refetch. Update also invalidates the
// agent's own single_agent detail so the setup page reflects saved Basic Info.

export function useCreateSingleAgentMutation(): UseMutationResult<
  CreateSingleAgentResult,
  Error,
  CreateSingleAgentInput
> {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSingleAgentInput) =>
      createSingleAgent(apiClient, input),
    onSuccess: (_data, { organizationId }) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: [AGENT_INFOS_QUERY_KEY_PREFIX],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            STUDIO_AGENTS_QUERY_KEY_PREFIX,
            "organization",
            organizationId,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: [STUDIO_AGENTS_QUERY_KEY_PREFIX, "platform"],
        }),
      ]),
  });
}

export function usePublishSingleAgentMutation(): UseMutationResult<
  void,
  Error,
  PublishSingleAgentSelection
> {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PublishSingleAgentSelection) =>
      publishSingleAgent(apiClient, input),
    onSuccess: (_data, { agentId }) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: [AGENT_INFOS_QUERY_KEY_PREFIX],
        }),
        queryClient.invalidateQueries({
          queryKey: [SINGLE_AGENT_QUERY_KEY_PREFIX, agentId],
        }),
        queryClient.invalidateQueries({
          queryKey: [STUDIO_AGENTS_QUERY_KEY_PREFIX],
        }),
      ]),
  });
}

export function useDeleteSingleAgentMutation(): UseMutationResult<
  void,
  Error,
  string
> {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (agentId: string) => deleteSingleAgent(apiClient, agentId),
    onSuccess: (_data, agentId) => {
      queryClient.removeQueries({
        queryKey: [SINGLE_AGENT_QUERY_KEY_PREFIX, agentId],
      });
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: [AGENT_INFOS_QUERY_KEY_PREFIX],
        }),
        queryClient.invalidateQueries({
          queryKey: [STUDIO_AGENTS_QUERY_KEY_PREFIX],
        }),
      ]);
    },
  });
}

export function useUpdateSingleAgentMutation(): UseMutationResult<
  void,
  Error,
  UpdateSingleAgentInput
> {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSingleAgentInput) =>
      updateSingleAgent(apiClient, input),
    onSuccess: (_data, { agentId }) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: [AGENT_INFOS_QUERY_KEY_PREFIX],
        }),
        queryClient.invalidateQueries({
          queryKey: [SINGLE_AGENT_QUERY_KEY_PREFIX, agentId],
        }),
        queryClient.invalidateQueries({
          queryKey: [STUDIO_AGENTS_QUERY_KEY_PREFIX],
        }),
      ]),
  });
}
