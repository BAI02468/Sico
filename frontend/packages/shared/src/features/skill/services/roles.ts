import type { AxiosInstance } from "axios";

import { AGENT_ENDPOINTS } from "../../../constants/endpoints";
import { apiResponseSchema, unwrapData } from "../../../schemas/api";
import { type Role, rolesPayloadSchema } from "../schemas/roles";

const rolesEnvelope = apiResponseSchema(rolesPayloadSchema);

export async function fetchRoles(apiClient: AxiosInstance): Promise<Role[]> {
  const res = await apiClient.get<unknown>(AGENT_ENDPOINTS.roles);
  return unwrapData(rolesEnvelope.parse(res.data), "fetchRoles");
}
