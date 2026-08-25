import {
  useQuery,
  type UseQueryResult,
  useSuspenseQuery,
  type UseSuspenseQueryOptions,
  type UseSuspenseQueryResult,
} from "@tanstack/react-query";
import type { AxiosInstance } from "axios";

import { useApiClient } from "../../../services/api-client-context";
import { membershipKeys } from "../query-keys";
import { type ProjectMember } from "../schemas/project-member";
import { fetchProjectMembers } from "../services/project-membership";

type ProjectMembersQueryKey = ReturnType<typeof membershipKeys.project>;

export function projectMembersQueryOptions(
  projectId: number,
  apiClient: AxiosInstance,
): UseSuspenseQueryOptions<
  ProjectMember[],
  Error,
  ProjectMember[],
  ProjectMembersQueryKey
> {
  return {
    queryKey: membershipKeys.project(projectId),
    queryFn: (): Promise<ProjectMember[]> =>
      fetchProjectMembers(apiClient, projectId),
    staleTime: 30_000,
  };
}

/** Suspense variant — the members page renders inside a Suspense boundary. */
export function useProjectMembersSuspenseQuery(
  projectId: number,
): UseSuspenseQueryResult<ProjectMember[]> {
  const apiClient = useApiClient();
  return useSuspenseQuery(projectMembersQueryOptions(projectId, apiClient));
}

/** Non-suspense variant — used by the Reassign dialog's operator dropdown. */
export function useProjectMembersQuery(
  projectId: number,
): UseQueryResult<ProjectMember[]> {
  const apiClient = useApiClient();
  return useQuery(projectMembersQueryOptions(projectId, apiClient));
}
