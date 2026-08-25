import { type QueryClient } from "@tanstack/react-query";

import { membershipKeys } from "../../membership";
import { projectKeys } from "../../projects/query-keys";
import { rbacKeys } from "../../rbac/query-keys";

export function invalidateProjectMemberAccess(
  queryClient: QueryClient,
  {
    projectId,
    targetUserId,
    currentUserId,
  }: {
    projectId: number;
    targetUserId: number;
    currentUserId: number | null;
  },
): Promise<void[]> {
  if (targetUserId === currentUserId) {
    queryClient.setQueryData(rbacKeys.userRoles(currentUserId), []);
  }
  const invalidations = [
    queryClient.invalidateQueries({
      queryKey: membershipKeys.project(projectId),
    }),
    queryClient.invalidateQueries({
      queryKey: projectKeys.detail(projectId),
    }),
    queryClient.invalidateQueries({
      queryKey: rbacKeys.userRoles(targetUserId),
      exact: true,
    }),
  ];
  if (targetUserId === currentUserId) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: projectKeys.lists(),
        exact: false,
      }),
    );
  }
  return Promise.all(invalidations);
}
