import {
  useQuery,
  type UseQueryResult,
  useSuspenseQuery,
  type UseSuspenseQueryOptions,
  type UseSuspenseQueryResult,
} from "@tanstack/react-query";
import type { AxiosInstance } from "axios";

import { useApiClient } from "../../../services/api-client-context";
import { type StudioAgentsPayload } from "../schemas/studio-agent";
import {
  fetchStudioAgents,
  STUDIO_AGENT_INTENT,
  STUDIO_AGENT_PUBLISH_STATUS_LIST,
  type StudioAgentsScope,
} from "../services/single-agents";

export const STUDIO_AGENTS_QUERY_KEY_PREFIX = "studio-agents";

type StudioAgentsQueryKey =
  | readonly [
      "studio-agents",
      "platform",
      typeof STUDIO_AGENT_PUBLISH_STATUS_LIST,
      typeof STUDIO_AGENT_INTENT,
    ]
  | readonly [
      "studio-agents",
      "organization",
      number,
      typeof STUDIO_AGENT_PUBLISH_STATUS_LIST,
      typeof STUDIO_AGENT_INTENT,
    ];

function studioAgentsQueryKey(scope: StudioAgentsScope): StudioAgentsQueryKey {
  if (scope.type === "platform") {
    return [
      STUDIO_AGENTS_QUERY_KEY_PREFIX,
      "platform",
      STUDIO_AGENT_PUBLISH_STATUS_LIST,
      STUDIO_AGENT_INTENT,
    ];
  }
  return [
    STUDIO_AGENTS_QUERY_KEY_PREFIX,
    "organization",
    scope.organizationId,
    STUDIO_AGENT_PUBLISH_STATUS_LIST,
    STUDIO_AGENT_INTENT,
  ];
}

export function studioAgentsQueryOptions(
  apiClient: AxiosInstance,
  scope: StudioAgentsScope,
): UseSuspenseQueryOptions<
  StudioAgentsPayload,
  Error,
  StudioAgentsPayload,
  StudioAgentsQueryKey
> {
  return {
    queryKey: studioAgentsQueryKey(scope),
    queryFn: (): Promise<StudioAgentsPayload> =>
      fetchStudioAgents(apiClient, scope),
    staleTime: 30_000,
  };
}

export function useStudioAgentsQuery(
  scope: StudioAgentsScope,
): UseQueryResult<StudioAgentsPayload> {
  const apiClient = useApiClient();
  return useQuery(studioAgentsQueryOptions(apiClient, scope));
}

export function useStudioAgentsSuspenseQuery(
  scope: StudioAgentsScope,
): UseSuspenseQueryResult<StudioAgentsPayload> {
  const apiClient = useApiClient();
  return useSuspenseQuery(studioAgentsQueryOptions(apiClient, scope));
}
