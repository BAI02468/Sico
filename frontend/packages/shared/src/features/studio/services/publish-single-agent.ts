import type { AxiosInstance } from "axios";
import { z } from "zod";

import { AGENT_ENDPOINTS } from "../../../constants/endpoints";
import { apiResponseSchema, assertOk } from "../../../schemas/api";
import {
  PublishAccessStatusSchema,
  publishSingleAgentSchema,
  publishSingleAgentSelectionSchema,
} from "../schemas/publish-single-agent";

const publishEnvelope = apiResponseSchema(z.unknown());

export async function publishSingleAgent(
  apiClient: AxiosInstance,
  input: unknown,
): Promise<void> {
  const selection = publishSingleAgentSelectionSchema.parse(input);
  const body = publishSingleAgentSchema.parse({
    agentId: selection.agentId,
    publishStatus: PublishAccessStatusSchema.parse(selection.access),
  });
  const response = await apiClient.post<unknown>(
    AGENT_ENDPOINTS.singleAgentPublish,
    body,
  );
  assertOk(publishEnvelope.parse(response.data), "publishSingleAgent");
}
