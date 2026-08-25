import {
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";

import { AGENTS_QUERY_KEY_PREFIX } from "./use-agents-query";
import { useApiClient } from "../../../services/api-client-context";
import { projectKeys } from "../../projects/query-keys";
import {
  createAgentInstance,
  type CreateAgentInstanceInput,
  type CreatedAgentInstance,
} from "../services/agents";

// Invalidate agent lists, project lists, and the owning project detail so the
// new instance appears on every relevant surface without staling unrelated
// project detail or asset caches.
export function useCreateAgentInstanceMutation(): UseMutationResult<
  CreatedAgentInstance,
  Error,
  CreateAgentInstanceInput
> {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAgentInstanceInput) =>
      createAgentInstance(apiClient, input),
    onSuccess: (_created, vars) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: AGENTS_QUERY_KEY_PREFIX,
          exact: false,
        }),
        queryClient.invalidateQueries({
          queryKey: projectKeys.lists(),
          exact: false,
        }),
        queryClient.invalidateQueries({
          queryKey: projectKeys.detail(vars.projectId),
          exact: true,
        }),
      ]),
  });
}
