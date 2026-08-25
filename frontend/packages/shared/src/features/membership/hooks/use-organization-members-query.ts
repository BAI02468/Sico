import {
  useSuspenseQuery,
  type UseSuspenseQueryOptions,
  type UseSuspenseQueryResult,
} from "@tanstack/react-query";
import type { AxiosInstance } from "axios";

import { useApiClient } from "../../../services/api-client-context";
import { membershipKeys } from "../query-keys";
import { fetchOrganizationMembers } from "../services/organization-membership";
import { type OrganizationMember } from "../types";

export function organizationMembersQueryOptions(
  organizationId: number,
  apiClient: AxiosInstance,
): UseSuspenseQueryOptions<OrganizationMember[]> {
  return {
    queryKey: membershipKeys.organization(organizationId),
    queryFn: () => fetchOrganizationMembers(apiClient, organizationId),
    staleTime: 30_000,
  };
}

export function useOrganizationMembersQuery(
  organizationId: number,
): UseSuspenseQueryResult<OrganizationMember[]> {
  const apiClient = useApiClient();
  return useSuspenseQuery(
    organizationMembersQueryOptions(organizationId, apiClient),
  );
}
