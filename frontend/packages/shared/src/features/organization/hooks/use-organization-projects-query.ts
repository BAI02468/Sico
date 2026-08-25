import {
  type InfiniteData,
  useSuspenseInfiniteQuery,
  type UseSuspenseInfiniteQueryOptions,
  type UseSuspenseInfiniteQueryResult,
} from "@tanstack/react-query";
import type { AxiosInstance } from "axios";

import { type Paged } from "../../../schemas/paginated";
import { useApiClient } from "../../../services/api-client-context";
import { type OrganizationProject } from "../../projects/schemas/project";
import { fetchOrganizationProjects } from "../../projects/services/projects";
import { organizationKeys } from "../query-keys";

const ORGANIZATION_PROJECT_PAGE_SIZE = 50;

type OrganizationProjectsQueryKey = readonly [
  "organization",
  number,
  "projects",
  { readonly pageSize: number },
];

type OrganizationProjectsOptions = UseSuspenseInfiniteQueryOptions<
  Paged<OrganizationProject>,
  Error,
  InfiniteData<Paged<OrganizationProject>>,
  OrganizationProjectsQueryKey,
  number
>;

export function organizationProjectsQueryOptions(
  organizationId: number,
  apiClient: AxiosInstance,
): OrganizationProjectsOptions {
  return {
    queryKey: [
      ...organizationKeys.projects(organizationId),
      { pageSize: ORGANIZATION_PROJECT_PAGE_SIZE },
    ],
    queryFn: ({ pageParam }) =>
      fetchOrganizationProjects(apiClient, organizationId, {
        page: pageParam,
        pageSize: ORGANIZATION_PROJECT_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.hasNext && lastPage.items.length > 0
        ? lastPageParam + 1
        : undefined,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  };
}

export function useOrganizationProjectsQuery(
  organizationId: number,
): UseSuspenseInfiniteQueryResult<InfiniteData<Paged<OrganizationProject>>> {
  const apiClient = useApiClient();
  return useSuspenseInfiniteQuery(
    organizationProjectsQueryOptions(organizationId, apiClient),
  );
}

export function selectDedupedOrganizationProjects(
  pages: Paged<OrganizationProject>[],
): OrganizationProject[] {
  const byId = new Map<OrganizationProject["id"], OrganizationProject>();
  for (const page of pages) {
    for (const project of page.items) {
      const existing = byId.get(project.id);
      if (!existing || project.updatedAt >= existing.updatedAt) {
        byId.set(project.id, project);
      }
    }
  }
  return Array.from(byId.values());
}
