import { useLingui } from "@lingui/react/macro";
import { toast } from "@sico/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { useRef } from "react";

import { useCreateConversation } from "./use-create-conversation";
import { seedEmptyHistory } from "./use-history";
import { type CommonAttachment } from "../../../schemas/common-attachment";
import { logger } from "../../../utils/logger";
import { pendingMessageAtom } from "../atoms/chat-atom";

type HomeSubmit = {
  handleSubmit: (text: string, attachments: CommonAttachment[]) => void;
  submitting: boolean;
};

// The DW home's `create-first` submit: mint a conversation, park the message,
// and navigate via `onSubmitted`. Extracted from `DigitalWorkerHomeContent` so
// the component stays a thin renderer. A synchronous `submittingRef` blocks a
// same-tick double-submit (`isPending` only flips on re-render, so two clicks in
// one tick would both fire `POST /conversation`).
export function useHomeSubmit(
  agentInstanceId: number,
  onSubmitted: (conversationId: number) => void,
): HomeSubmit {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const setPending = useSetAtom(pendingMessageAtom);
  const createConversation = useCreateConversation();
  const submittingRef = useRef(false);

  const handleSubmit = (
    text: string,
    attachments: CommonAttachment[],
  ): void => {
    if (submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    // Mint the conversation first so it's addressable (routed + listed) from the
    // first message. On failure the draft + attachments survive in the Composer,
    // so the user can retry without re-typing. The backend names the conversation.
    createConversation.mutate(
      { agentInstanceId },
      {
        onSuccess: (conversation) => {
          // Prime the history cache with an empty page so the chat page's
          // MessageHistory doesn't suspend on mount — the parked message renders
          // immediately in one MessageList instance (no skeleton flash).
          seedEmptyHistory(queryClient, agentInstanceId, conversation.id);
          setPending({
            agentInstanceId,
            conversationId: conversation.id,
            text,
            attachments,
          });
          onSubmitted(conversation.id);
          // Deliberately do NOT reset `submittingRef` here: success navigates
          // away and unmounts this hook, so the guard should stay closed for the
          // component's remaining lifetime. Resetting it would briefly reopen the
          // double-submit window this ref exists to close.
        },
        onError: (error) => {
          submittingRef.current = false;
          logger.error("chat: create conversation failed", {
            agentInstanceId,
            error,
          });
          toast.error(
            t({
              id: "chat.dwHomeContent.error.startConversationFailed",
              message: "Couldn't start a conversation. Please try again.",
            }),
          );
        },
      },
    );
  };

  return { handleSubmit, submitting: createConversation.isPending };
}
