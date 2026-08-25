import {
  useQuery,
  type UseQueryResult,
  useSuspenseQuery,
  type UseSuspenseQueryResult,
} from "@tanstack/react-query";
import { useAtomValue } from "jotai";

import { userAtom } from "../atoms/auth-atom";
import { boundOrganizationQueryOptions } from "../features/organization/hooks/use-organization-query";
import { type OrganizationSummary } from "../features/organization/schemas/organization";
import { useApiClient } from "../services/api-client-context";

export function useBoundOrganizationQuery(): UseQueryResult<OrganizationSummary | null> {
  const apiClient = useApiClient();
  const userId = useAtomValue(userAtom)?.id ?? null;
  return useQuery(boundOrganizationQueryOptions(apiClient, userId));
}

export function useBoundOrganizationSuspenseQuery(): UseSuspenseQueryResult<OrganizationSummary | null> {
  const apiClient = useApiClient();
  const userId = useAtomValue(userAtom)?.id ?? null;
  const query = useSuspenseQuery(
    boundOrganizationQueryOptions(apiClient, userId),
  );
  if (query.isError) {
    if (!query.isFetching) {
      throw query.error;
    }
    return { ...query, data: null };
  }
  return query;
}
