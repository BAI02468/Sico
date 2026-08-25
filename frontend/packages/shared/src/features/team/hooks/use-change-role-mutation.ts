import {
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { useAtomValue } from "jotai";

import { userAtom } from "../../../atoms/auth-atom";
import { useApiClient } from "../../../services/api-client-context";
import {
  changeProjectMemberRole,
  type ChangeProjectMemberRoleInput,
  membershipKeys,
  type ProjectMember,
} from "../../membership";
import { invalidateProjectMemberAccess } from "../utils/invalidate-project-member-access";

export type ChangeRoleInput = ChangeProjectMemberRoleInput;

// Update the roster optimistically, then reconcile membership and access caches
// after the Team service settles.
export function useChangeRoleMutation(
  projectId: number,
): UseMutationResult<
  void,
  Error,
  ChangeRoleInput,
  { previous: ProjectMember[] | undefined }
> {
  const apiClient = useApiClient();
  const currentUserId = useAtomValue(userAtom)?.id ?? null;
  const queryClient = useQueryClient();
  const queryKey = membershipKeys.project(projectId);
  return useMutation({
    mutationFn: (input: ChangeRoleInput) =>
      changeProjectMemberRole(apiClient, projectId, input),
    onMutate: async ({ userId, toRoleCode }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ProjectMember[]>(queryKey);
      queryClient.setQueryData<ProjectMember[]>(queryKey, (members) =>
        members?.map((member) =>
          member.id === userId ? { ...member, roleCode: toRoleCode } : member,
        ),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: (_data, _error, input) =>
      invalidateProjectMemberAccess(queryClient, {
        projectId,
        targetUserId: input.userId,
        currentUserId,
      }),
  });
}
