import {
  useQuery,
  type UseQueryResult,
  useSuspenseQuery,
  type UseSuspenseQueryResult,
} from "@tanstack/react-query";
import { useAtomValue } from "jotai";

import { userAtom } from "../../../atoms/auth-atom";
import { useApiClient } from "../../../services/api-client-context";
import { userRolesQueryOptions } from "../capabilities";
import {
  EMPTY_PERMISSION_SNAPSHOT,
  normalizePermissionSnapshot,
  type PermissionSnapshot,
} from "../permission-snapshot";

export function usePermissionSnapshotQuery(): UseQueryResult<PermissionSnapshot> {
  const apiClient = useApiClient();
  const userId = useAtomValue(userAtom)?.id ?? null;
  return useQuery({
    ...userRolesQueryOptions(apiClient, userId),
    select: normalizePermissionSnapshot,
  });
}

export function usePermissionSnapshotSuspenseQuery(): UseSuspenseQueryResult<PermissionSnapshot> {
  const apiClient = useApiClient();
  const userId = useAtomValue(userAtom)?.id ?? null;
  const query = useSuspenseQuery({
    ...userRolesQueryOptions(apiClient, userId),
    select: normalizePermissionSnapshot,
  });
  if (query.isError) {
    if (!query.isFetching) {
      throw query.error;
    }
    return { ...query, data: EMPTY_PERMISSION_SNAPSHOT };
  }
  return query;
}
