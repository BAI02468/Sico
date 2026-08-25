import { z } from "zod";

export const commonAttachmentSchema = z.object({
  name: z.string(),
  size: z.number(),
  type: z.string(),
  uri: z.string(),
  sasUrl: z.string().optional(),
});
export type CommonAttachment = z.infer<typeof commonAttachmentSchema>;
