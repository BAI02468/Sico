import { useAtomValue } from "jotai";

import {
  usePermissionSnapshotQuery,
  usePermissionSnapshotSuspenseQuery,
} from "./use-permission-snapshot";
import { userAtom } from "../../../atoms/auth-atom";
import {
  useBoundOrganizationQuery,
  useBoundOrganizationSuspenseQuery,
} from "../../../hooks/use-bound-organization";
import {
  deriveOrganizationCapabilities,
  deriveStudioPermission,
  EMPTY_PERMISSION_SNAPSHOT,
  type OrganizationCapabilities,
  type PermissionSnapshot,
} from "../permission-snapshot";

export type OrganizationPermissionCapabilities = OrganizationCapabilities & {
  canEnterStudio: boolean;
  canManage: boolean;
};

export type OrganizationPermission = OrganizationPermissionCapabilities & {
  currentUserId: number | null;
  isPending: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => unknown;
};

function deriveOrganizationPermission(
  snapshot: PermissionSnapshot,
  organizationId: number | null,
): OrganizationPermissionCapabilities {
  const capabilities = deriveOrganizationCapabilities(snapshot, organizationId);
  return {
    ...capabilities,
    canEnterStudio: deriveStudioPermission(snapshot, organizationId),
    canManage:
      capabilities.canRenameOrganization &&
      capabilities.canManageOrganizationMembers &&
      capabilities.canManageOrganizationDevices,
  };
}

export function useOrganizationPermission(): OrganizationPermission {
  const user = useAtomValue(userAtom);
  const organization = useBoundOrganizationQuery();
  const permissions = usePermissionSnapshotQuery();
  const snapshot = permissions.isSuccess
    ? permissions.data
    : EMPTY_PERMISSION_SNAPSHOT;
  const organizationId = organization.isSuccess
    ? (organization.data?.id ?? null)
    : null;
  return {
    ...deriveOrganizationPermission(snapshot, organizationId),
    currentUserId: user?.id ?? null,
    isPending: organization.isPending || permissions.isPending,
    isLoading: organization.isLoading || permissions.isLoading,
    isError: organization.isError || permissions.isError,
    error: organization.error ?? permissions.error,
    refetch: () => Promise.all([organization.refetch(), permissions.refetch()]),
  };
}

export function useOrganizationPermissionSuspense(): OrganizationPermissionCapabilities {
  const { data: organization } = useBoundOrganizationSuspenseQuery();
  const { data: snapshot } = usePermissionSnapshotSuspenseQuery();
  return deriveOrganizationPermission(snapshot, organization?.id ?? null);
}
