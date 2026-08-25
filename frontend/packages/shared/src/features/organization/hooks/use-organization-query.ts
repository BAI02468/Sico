import {
  useQuery,
  type UseQueryResult,
  useSuspenseQuery,
  type UseSuspenseQueryOptions,
  type UseSuspenseQueryResult,
} from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import { useAtomValue } from "jotai";

import { userAtom } from "../../../atoms/auth-atom";
import { useApiClient } from "../../../services/api-client-context";
import { organizationKeys } from "../query-keys";
import {
  type OrganizationDetail,
  type OrganizationSummary,
} from "../schemas/organization";
import {
  fetchOrganization,
  fetchUserOrganizations,
} from "../services/organization";

type UserOrganizationsQueryKey = ReturnType<
  typeof organizationKeys.userOrganizations
>;

export function userOrganizationsQueryOptions(
  apiClient: AxiosInstance,
  userId: number | null,
): UseSuspenseQueryOptions<
  OrganizationSummary[],
  Error,
  OrganizationSummary[],
  UserOrganizationsQueryKey
> {
  return {
    queryKey: organizationKeys.userOrganizations(userId),
    queryFn: () =>
      userId === null ? Promise.resolve([]) : fetchUserOrganizations(apiClient),
    staleTime: 30_000,
  };
}

export function boundOrganizationQueryOptions(
  apiClient: AxiosInstance,
  userId: number | null,
): UseSuspenseQueryOptions<
  OrganizationSummary[],
  Error,
  OrganizationSummary | null,
  UserOrganizationsQueryKey
> {
  return {
    ...userOrganizationsQueryOptions(apiClient, userId),
    select: (organizations) => organizations[0] ?? null,
  };
}

export function useUserOrganizationsQuery(): UseQueryResult<
  OrganizationSummary[]
> {
  const apiClient = useApiClient();
  const userId = useAtomValue(userAtom)?.id ?? null;
  return useQuery(userOrganizationsQueryOptions(apiClient, userId));
}

export function useUserOrganizationsSuspenseQuery(): UseSuspenseQueryResult<
  OrganizationSummary[]
> {
  const apiClient = useApiClient();
  const userId = useAtomValue(userAtom)?.id ?? null;
  return useSuspenseQuery(userOrganizationsQueryOptions(apiClient, userId));
}

export function organizationDetailQueryOptions(
  organizationId: number,
  apiClient: AxiosInstance,
): UseSuspenseQueryOptions<OrganizationDetail> {
  return {
    queryKey: organizationKeys.detail(organizationId),
    queryFn: () => fetchOrganization(apiClient, organizationId),
    staleTime: 30_000,
  };
}

export function useOrganizationDetailQuery(
  organizationId: number,
): UseSuspenseQueryResult<OrganizationDetail> {
  const apiClient = useApiClient();
  return useSuspenseQuery(
    organizationDetailQueryOptions(organizationId, apiClient),
  );
}
