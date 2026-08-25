import type { AxiosInstance } from "axios";

import { AGENT_ENDPOINTS } from "../../../constants/endpoints";
import { apiResponseSchema, unwrapData } from "../../../schemas/api";
import {
  type SingleAgentDetail,
  singleAgentPayloadSchema,
} from "../schemas/single-agent";
import {
  agentInfosPayloadSchema,
  type SingleAgentCard,
} from "../schemas/single-agent-card";
import {
  type StudioAgentsPayload,
  studioAgentsPayloadSchema,
} from "../schemas/studio-agent";

const agentInfosEnvelope = apiResponseSchema(agentInfosPayloadSchema);
const singleAgentEnvelope = apiResponseSchema(singleAgentPayloadSchema);
const studioAgentsEnvelope = apiResponseSchema(studioAgentsPayloadSchema);

export const PLATFORM_AGENT_INFOS_INTENT = 1;
export type AgentInfosIntent = typeof PLATFORM_AGENT_INFOS_INTENT;

export const STUDIO_AGENT_PUBLISH_STATUS_LIST = "0,1";
export const STUDIO_AGENT_INTENT = 0;

export type StudioAgentsScope =
  | { readonly type: "platform" }
  | { readonly type: "organization"; readonly organizationId: number };

// Legacy: GET dwp/agent/single_agent_infos. The dwp prefix is dropped in the
// new repo (apiClient baseURL `/api/sico`), so the path is /agent/single_agent_infos.
export async function fetchAgentInfos(
  apiClient: AxiosInstance,
  intent?: AgentInfosIntent,
): Promise<SingleAgentCard[]> {
  const config = intent === undefined ? undefined : { params: { intent } };
  const res = await apiClient.get<unknown>(
    AGENT_ENDPOINTS.singleAgentInfos,
    config,
  );
  return unwrapData(agentInfosEnvelope.parse(res.data), "fetchAgentInfos");
}

export async function fetchStudioAgents(
  apiClient: AxiosInstance,
  scope: StudioAgentsScope,
): Promise<StudioAgentsPayload> {
  if (
    scope.type === "organization" &&
    (!Number.isSafeInteger(scope.organizationId) || scope.organizationId <= 0)
  ) {
    throw new Error("A positive organization ID is required");
  }
  const organizationParams =
    scope.type === "organization"
      ? { organizationId: scope.organizationId }
      : {};
  const res = await apiClient.get<unknown>(AGENT_ENDPOINTS.singleAgents, {
    params: {
      ...organizationParams,
      publishStatusList: STUDIO_AGENT_PUBLISH_STATUS_LIST,
      intent: STUDIO_AGENT_INTENT,
    },
  });
  const payload = unwrapData(
    studioAgentsEnvelope.parse(res.data),
    "fetchStudioAgents",
  );
  if (
    scope.type === "organization" &&
    payload.agents.some(
      (agent) => agent.organizationId !== scope.organizationId,
    )
  ) {
    throw new Error(
      "Studio agent organization does not match the requested scope",
    );
  }
  return payload;
}

// Legacy: GET dwp/agent/single_agent?agentId=<id>. The dwp prefix is dropped
// (baseURL `/api/sico`), so the path is /agent/single_agent. Returns the
// opaque-ID studio draft (name/role) that backs the setup page — distinct from
// the numeric single_agent_instance detail.
export async function fetchSingleAgent(
  apiClient: AxiosInstance,
  agentId: string,
): Promise<SingleAgentDetail> {
  const res = await apiClient.get<unknown>(AGENT_ENDPOINTS.singleAgent, {
    params: { agentId },
  });
  return unwrapData(singleAgentEnvelope.parse(res.data), "fetchSingleAgent");
}
