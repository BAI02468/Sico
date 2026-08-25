import {
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { useAtomValue } from "jotai";

import { userAtom } from "../../../atoms/auth-atom";
import { useApiClient } from "../../../services/api-client-context";
import {
  removeOrganizationMember,
  type RemoveOrganizationMemberInput,
} from "../../membership";
import { invalidateOrganizationMemberAccess } from "../utils/invalidate-organization-member-access";

export function useRemoveOrganizationMember(
  organizationId: number,
): UseMutationResult<void, Error, RemoveOrganizationMemberInput> {
  const apiClient = useApiClient();
  const currentUserId = useAtomValue(userAtom)?.id ?? null;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) =>
      removeOrganizationMember(apiClient, organizationId, input),
    onSettled: (_data, error, input) => {
      invalidateOrganizationMemberAccess({
        queryClient,
        organizationId,
        targetUserId: input.userId,
        currentUserId,
        membershipRemoved: error === null,
      });
    },
  });
}
