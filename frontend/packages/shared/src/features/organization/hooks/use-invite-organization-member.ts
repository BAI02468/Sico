import {
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";

import { useApiClient } from "../../../services/api-client-context";
import {
  inviteOrganizationMember,
  type InviteOrganizationMemberInput,
  membershipKeys,
} from "../../membership";

export type { InviteOrganizationMemberInput } from "../../membership";

export function useInviteOrganizationMember(
  organizationId: number,
): UseMutationResult<void, Error, InviteOrganizationMemberInput> {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }) =>
      inviteOrganizationMember(apiClient, organizationId, email, role),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: membershipKeys.organization(organizationId),
        exact: true,
      });
    },
  });
}
