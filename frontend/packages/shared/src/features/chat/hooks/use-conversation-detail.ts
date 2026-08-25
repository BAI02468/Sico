import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { AxiosInstance } from "axios";

import { useApiClient } from "../../../services/api-client-context";
import { chatKeys } from "../query-keys";
import type { ConversationSummary } from "../schemas/conversation";
import { getConversation } from "../services/conversation";

type ConversationDetailQueryKey = ReturnType<
  typeof chatKeys.conversationDetail
>;

export function conversationDetailQueryKey(
  id: number,
): ConversationDetailQueryKey {
  return chatKeys.conversationDetail(id);
}

export function conversationDetailQueryOptions(
  id: number,
  apiClient: AxiosInstance,
): UseQueryOptions<
  ConversationSummary,
  Error,
  ConversationSummary,
  ConversationDetailQueryKey
> {
  return {
    queryKey: conversationDetailQueryKey(id),
    queryFn: (): Promise<ConversationSummary> => getConversation(apiClient, id),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  };
}

export function useConversationDetail(
  id: number,
  enabled = true,
): UseQueryResult<ConversationSummary> {
  const apiClient = useApiClient();
  return useQuery({
    ...conversationDetailQueryOptions(id, apiClient),
    enabled,
  });
}
