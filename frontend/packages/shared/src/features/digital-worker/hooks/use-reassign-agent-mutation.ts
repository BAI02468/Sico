import {
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";

import { AGENTS_QUERY_KEY_PREFIX } from "./use-agents-query";
import { useApiClient } from "../../../services/api-client-context";
import { projectKeys } from "../../projects/query-keys";
import { reassignAgentInstance } from "../services/agents";

export type ReassignAgentInput = {
  id: number;
  newOperatorUsername: string;
};

// Reassign a digital worker to a new operator. Invalidates the agents list AND
// the projects list so the operator change is reflected everywhere.
export function useReassignAgentMutation(): UseMutationResult<
  void,
  Error,
  ReassignAgentInput
> {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReassignAgentInput) =>
      reassignAgentInstance(apiClient, input),
    onSuccess: (_data, { id }) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: AGENTS_QUERY_KEY_PREFIX,
          exact: false,
        }),
        queryClient.invalidateQueries({
          queryKey: projectKeys.all,
          exact: false,
        }),
        queryClient.invalidateQueries({
          queryKey: ["agents", "detail", id],
          exact: true,
        }),
      ]),
  });
}
