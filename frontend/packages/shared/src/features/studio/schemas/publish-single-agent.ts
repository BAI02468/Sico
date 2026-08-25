import { z } from "zod";

import { studioAgentIdSchema } from "./single-agent";
import { SingleAgentPublishStatusSchema } from "./studio-agent";

export const PublishAccessSchema = z.enum(["only_me", "organization"]);
export type PublishAccess = z.infer<typeof PublishAccessSchema>;

export const PublishAccessStatusSchema = PublishAccessSchema.transform(
  (access) =>
    access === "only_me"
      ? SingleAgentPublishStatusSchema.enum.DRAFT
      : SingleAgentPublishStatusSchema.enum.PUBLISHED,
);

export const publishSingleAgentSelectionSchema = z.object({
  agentId: studioAgentIdSchema,
  access: PublishAccessSchema,
});
export type PublishSingleAgentSelection = z.infer<
  typeof publishSingleAgentSelectionSchema
>;

export const publishSingleAgentSchema = z.object({
  agentId: studioAgentIdSchema,
  publishStatus: z.union([
    z.literal(SingleAgentPublishStatusSchema.enum.DRAFT),
    z.literal(SingleAgentPublishStatusSchema.enum.PUBLISHED),
  ]),
});
export type PublishSingleAgentInput = z.infer<typeof publishSingleAgentSchema>;
