import { type QueryClient } from "@tanstack/react-query";

import { membershipKeys } from "../../membership";
import { rbacKeys } from "../../rbac/query-keys";
import { type UserRole } from "../../rbac/schemas/user-role";
import { organizationKeys } from "../query-keys";
import { type OrganizationSummary } from "../schemas/organization";

type InvalidateOrganizationMemberAccessOptions = {
  queryClient: QueryClient;
  organizationId: number;
  targetUserId: number;
  currentUserId: number | null;
  membershipRemoved?: boolean;
};

export function invalidateOrganizationMemberAccess({
  queryClient,
  organizationId,
  targetUserId,
  currentUserId,
  membershipRemoved = false,
}: InvalidateOrganizationMemberAccessOptions): void {
  void queryClient.invalidateQueries({
    queryKey: membershipKeys.organization(organizationId),
    exact: true,
  });
  if (targetUserId !== currentUserId) {
    return;
  }
  queryClient.setQueryData<UserRole[]>(rbacKeys.userRoles(currentUserId), []);
  if (membershipRemoved) {
    queryClient.setQueryData<OrganizationSummary[]>(
      organizationKeys.userOrganizations(currentUserId),
      [],
    );
  }
  void queryClient.invalidateQueries({
    queryKey: rbacKeys.userRoles(currentUserId),
    exact: true,
  });
  void queryClient.invalidateQueries({
    queryKey: organizationKeys.userOrganizations(currentUserId),
    exact: true,
  });
}
