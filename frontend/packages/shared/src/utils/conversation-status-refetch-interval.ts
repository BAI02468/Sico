import {
  type ConversationRunStatus,
  ConversationRunStatusSchema,
} from "../schemas/conversation-run-status";

type ConversationStatusItem = {
  readonly conversationStatus?: ConversationRunStatus;
};

export function conversationStatusRefetchInterval(
  items: Iterable<ConversationStatusItem>,
): number {
  for (const item of items) {
    if (item.conversationStatus === ConversationRunStatusSchema.enum.RUNNING) {
      return 2_000;
    }
  }
  return 30_000;
}
