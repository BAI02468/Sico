// POST /rbac/logout → envelope validation. Authorization is pinned to the
// initiating session so an ambient replacement token cannot be revoked.
// HTTP 401 means the server session is already absent; other failures throw a
// plain Error because callers don't branch on kind.
import type { AxiosInstance } from "axios";
import { z } from "zod";

import { RBAC_ENDPOINTS } from "../../../constants/endpoints";
import { HTTP_OK, HTTP_UNAUTHORIZED } from "../../../constants/http";
import { apiResponseSchema } from "../../../schemas/api";
import { logger } from "../../../utils/logger";

const envelopeSchema = apiResponseSchema(z.unknown());

export async function logoutApi(
  client: AxiosInstance,
  ownerToken: string,
): Promise<void> {
  let data: unknown;
  try {
    const response = await client.post(RBAC_ENDPOINTS.logout, undefined, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      validateStatus: (status) =>
        status === HTTP_UNAUTHORIZED || (status >= 200 && status < 300),
    });
    if (response.status === HTTP_UNAUTHORIZED) {
      return;
    }
    data = response.data;
  } catch (error) {
    logger.warn("logoutApi: axios request rejected", { error });
    throw new Error("logout: network unreachable");
  }
  const envelope = envelopeSchema.safeParse(data);
  if (!envelope.success) {
    logger.warn("logoutApi: malformed envelope", {
      issues: envelope.error.issues,
    });
    throw new Error("logout: malformed envelope");
  }
  if (envelope.data.code !== HTTP_OK) {
    logger.warn("logoutApi: server rejected", {
      code: envelope.data.code,
      msg: envelope.data.msg,
    });
    throw new Error("logout: server rejected");
  }
}
