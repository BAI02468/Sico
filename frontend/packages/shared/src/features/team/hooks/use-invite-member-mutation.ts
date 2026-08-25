import {
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { useAtomValue } from "jotai";

import { userAtom } from "../../../atoms/auth-atom";
import { useApiClient } from "../../../services/api-client-context";
import {
  inviteProjectMember,
  type InviteProjectMemberInput,
  ProjectMemberInviteError,
} from "../../membership";
import { invalidateProjectMemberAccess } from "../utils/invalidate-project-member-access";

export type InviteMemberByEmailInput = InviteProjectMemberInput;

// Email lookup can fail before a target exists. Reconcile only after a resolved
// success or a typed assignment failure carrying the affected user ID.
export function useInviteMemberByEmailMutation(
  projectId: number,
): UseMutationResult<number, Error, InviteMemberByEmailInput> {
  const apiClient = useApiClient();
  const currentUserId = useAtomValue(userAtom)?.id ?? null;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteMemberByEmailInput) =>
      inviteProjectMember(apiClient, projectId, input),
    onSettled: (targetUserId, error) => {
      const affectedUserId =
        targetUserId ??
        (error instanceof ProjectMemberInviteError ? error.targetUserId : null);
      if (affectedUserId === null) {
        return;
      }
      void invalidateProjectMemberAccess(queryClient, {
        projectId,
        targetUserId: affectedUserId,
        currentUserId,
      });
    },
  });
}
