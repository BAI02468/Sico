import {
  useSuspenseQuery,
  type UseSuspenseQueryResult,
} from "@tanstack/react-query";
import type { AxiosInstance } from "axios";

import { useApiClient } from "../../../services/api-client-context";
import { projectKeys } from "../query-keys";
import type { ProjectDetail } from "../schemas/project";
import { fetchProjectDetail } from "../services/projects";

export function projectDetailQueryOptions(
  id: number,
  apiClient: AxiosInstance,
): {
  queryKey: ReturnType<typeof projectKeys.detail>;
  queryFn: () => Promise<ProjectDetail>;
  staleTime: number;
} {
  return {
    queryKey: projectKeys.detail(id),
    queryFn: (): Promise<ProjectDetail> => fetchProjectDetail(apiClient, id),
    staleTime: 30_000,
  };
}

export function useProjectDetailQuery(
  id: number,
): UseSuspenseQueryResult<ProjectDetail> {
  const apiClient = useApiClient();
  return useSuspenseQuery(projectDetailQueryOptions(id, apiClient));
}
