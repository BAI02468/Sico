import {
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";

import { useApiClient } from "../../../services/api-client-context";
import { projectKeys } from "../query-keys";
import { deleteProject } from "../services/projects";

// Delete a project. Refresh every list variant, and mark the deleted detail
// stale without refetching it before the caller navigates away.
export function useDeleteProjectMutation(
  projectId: number,
): UseMutationResult<void, Error, void> {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteProject(apiClient, projectId),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: projectKeys.lists(),
          exact: false,
        }),
        queryClient.invalidateQueries({
          queryKey: projectKeys.detail(projectId),
          exact: true,
          refetchType: "none",
        }),
      ]),
  });
}
