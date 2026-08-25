import {
  type QueryClient,
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { useAtomValue } from "jotai";

import { userAtom } from "../../../atoms/auth-atom";
import { useApiClient } from "../../../services/api-client-context";
import {
  changeOrganizationMemberRole,
  type ChangeOrganizationRoleInput,
  membershipKeys,
  type OrganizationMember,
  organizationRoleCodesFor,
} from "../../membership";
import { rbacKeys } from "../../rbac/query-keys";
import { invalidateOrganizationMemberAccess } from "../utils/invalidate-organization-member-access";

async function cancelAndClearUserRoles(
  queryClient: QueryClient,
  userId: number | null,
): Promise<void> {
  const queryKey = rbacKeys.userRoles(userId);
  await queryClient.cancelQueries({ queryKey, exact: true });
  queryClient.setQueryData(queryKey, []);
}

export function useChangeOrganizationRole(
  organizationId: number,
): UseMutationResult<
  void,
  Error,
  ChangeOrganizationRoleInput,
  { previous: OrganizationMember[] | undefined }
> {
  const apiClient = useApiClient();
  const currentUserId = useAtomValue(userAtom)?.id ?? null;
  const queryClient = useQueryClient();
  const queryKey = membershipKeys.organization(organizationId);
  return useMutation({
    mutationFn: (input) =>
      changeOrganizationMemberRole(apiClient, organizationId, input),
    onMutate: async ({ userId, toRole }) => {
      if (userId === currentUserId) {
        await cancelAndClearUserRoles(queryClient, currentUserId);
      }
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<OrganizationMember[]>(queryKey);
      queryClient.setQueryData<OrganizationMember[]>(queryKey, (members) =>
        members?.map((member) =>
          member.id === userId
            ? {
                ...member,
                role: toRole,
                roleCodes: organizationRoleCodesFor(toRole),
              }
            : member,
        ),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: (_data, _error, input) => {
      invalidateOrganizationMemberAccess({
        queryClient,
        organizationId,
        targetUserId: input.userId,
        currentUserId,
      });
    },
  });
}
