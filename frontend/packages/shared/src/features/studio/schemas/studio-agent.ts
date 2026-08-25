import { z } from "zod";

import { singleAgentDetailSchema } from "./single-agent";

export const SingleAgentPublishStatusSchema = z.enum({
  DRAFT: 0,
  PUBLISHED: 1,
  ARCHIVED: 2,
});
export type SingleAgentPublishStatus = z.infer<
  typeof SingleAgentPublishStatusSchema
>;

export const studioAgentSchema = singleAgentDetailSchema.required().extend({
  creatorUsername: z.string(),
  organizationId: z.number().int().safe(),
  publishStatus: SingleAgentPublishStatusSchema,
});
export type StudioAgent = z.infer<typeof studioAgentSchema>;

export const studioAgentsPayloadSchema = z.object({
  agents: z.array(studioAgentSchema),
  total: z.number().int().nonnegative().safe(),
  hasNext: z.boolean(),
});
export type StudioAgentsPayload = z.infer<typeof studioAgentsPayloadSchema>;
