import { type QueryClient } from "@tanstack/react-query";

import { AGENTS_QUERY_KEY_PREFIX } from "../../digital-worker/hooks/use-agents-query";
import { chatKeys } from "../query-keys";

export function refreshConversationStatus(
  queryClient: QueryClient,
  agentInstanceId: number,
): void {
  void queryClient.invalidateQueries({
    queryKey: chatKeys.conversationList(agentInstanceId),
    exact: true,
  });
  void queryClient.invalidateQueries({ queryKey: AGENTS_QUERY_KEY_PREFIX });
}
