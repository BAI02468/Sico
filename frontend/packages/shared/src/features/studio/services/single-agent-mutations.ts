import type { AxiosInstance } from "axios";
import { z } from "zod";

import { AGENT_ENDPOINTS } from "../../../constants/endpoints";
import { apiResponseSchema, assertOk, unwrapData } from "../../../schemas/api";
import { studioAgentIdSchema } from "../schemas/single-agent";

// The dwp prefix is dropped in this repo (apiClient baseURL `/api/sico`), so
// the create and update paths are both /agent/single_agent.

const createResultSchema = z.object({ agentId: studioAgentIdSchema });
export type CreateSingleAgentResult = z.infer<typeof createResultSchema>;
const createEnvelope = apiResponseSchema(createResultSchema);

// update carries no `data` — branch on `code` only (assertOk).
const writeEnvelope = apiResponseSchema(z.unknown());

export type CreateSingleAgentInput = {
  name: string;
  role: string;
  desc?: string;
  organizationId: number;
};

export async function createSingleAgent(
  apiClient: AxiosInstance,
  { name, role, desc = "", organizationId }: CreateSingleAgentInput,
): Promise<CreateSingleAgentResult> {
  const res = await apiClient.post<unknown>(AGENT_ENDPOINTS.singleAgent, {
    name,
    role,
    desc,
    organizationId,
  });
  return unwrapData(createEnvelope.parse(res.data), "createSingleAgent");
}

export type UpdateSingleAgentInput = {
  agentId: string;
  name: string;
  role: string;
  desc?: string;
};

export async function updateSingleAgent(
  apiClient: AxiosInstance,
  { agentId, name, role, desc = "" }: UpdateSingleAgentInput,
): Promise<void> {
  const res = await apiClient.put<unknown>(AGENT_ENDPOINTS.singleAgent, {
    agentId,
    name,
    role,
    desc,
  });
  assertOk(writeEnvelope.parse(res.data), "updateSingleAgent");
}

export async function deleteSingleAgent(
  apiClient: AxiosInstance,
  agentId: string,
): Promise<void> {
  const res = await apiClient.delete<unknown>(AGENT_ENDPOINTS.singleAgent, {
    params: { agentId },
  });
  assertOk(writeEnvelope.parse(res.data), "deleteSingleAgent");
}
