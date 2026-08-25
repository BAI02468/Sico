import { z } from "zod";

// Backend conversation execution status. Wire integers — do not renumber.
export const ConversationRunStatusSchema = z.enum({
  UNKNOWN: 0,
  RUNNING: 1,
  IDLE: 2,
});
export type ConversationRunStatus = z.infer<typeof ConversationRunStatusSchema>;

// A missing/null/future value must not reject its containing list item.
export const conversationRunStatusSchema = ConversationRunStatusSchema.nullish()
  .catch(undefined)
  .transform((status) => status ?? undefined)
  .optional();
