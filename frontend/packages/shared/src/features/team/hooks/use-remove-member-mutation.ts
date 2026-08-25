import {
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { useAtomValue } from "jotai";

import { userAtom } from "../../../atoms/auth-atom";
import { useApiClient } from "../../../services/api-client-context";
import {
  removeProjectMember,
  type RemoveProjectMemberInput,
} from "../../membership";
import { invalidateProjectMemberAccess } from "../utils/invalidate-project-member-access";

export type RemoveMemberInput = RemoveProjectMemberInput;

// Reconcile membership and access caches after complete and partial removals.
export function useRemoveMemberMutation(
  projectId: number,
): UseMutationResult<void, Error, RemoveMemberInput> {
  const apiClient = useApiClient();
  const currentUserId = useAtomValue(userAtom)?.id ?? null;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RemoveMemberInput) =>
      removeProjectMember(apiClient, projectId, input),
    // Reconcile successful and partial multi-grant outcomes without keeping the
    // dialog pending on background refetches.
    onSettled: (_data, _error, input) => {
      void invalidateProjectMemberAccess(queryClient, {
        projectId,
        targetUserId: input.userId,
        currentUserId,
      });
    },
  });
}
