import {
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { useAtomValue } from "jotai";

import { userAtom } from "../../../atoms/auth-atom";
import { useApiClient } from "../../../services/api-client-context";
import { organizationKeys } from "../query-keys";
import { renameOrganization } from "../services/organization";

export function useRenameOrganization(
  organizationId: number,
): UseMutationResult<void, Error, string> {
  const apiClient = useApiClient();
  const userId = useAtomValue(userAtom)?.id ?? null;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name) => renameOrganization(apiClient, organizationId, name),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: organizationKeys.detail(organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: organizationKeys.userOrganizations(userId),
          exact: true,
        }),
      ]),
  });
}
