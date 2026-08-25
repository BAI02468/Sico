import { DigitalWorkerHome } from "@sico/shared";
import { conversationListQueryOptions } from "@sico/shared/features/chat/index.ts";
import {
  agentQueryOptions,
  isActiveStatus,
} from "@sico/shared/features/digital-worker/index.ts";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { type JSX } from "react";

// The index awaits fresh agent state before deciding whether an inactive worker
// should redirect to its newest historical conversation. The mounted Home owns
// a live agent subscription so later status changes update its controls.
export const Route = createFileRoute("/_authed/digital-worker/$agentId/")({
  loader: async ({ context, params }) => {
    const agentInstanceId = Number(params.agentId);
    const agent = await context.queryClient.fetchQuery({
      ...agentQueryOptions(agentInstanceId, context.apiClient),
      staleTime: 0,
    });
    if (isActiveStatus(agent.status)) {
      return;
    }
    const conversations = await context.queryClient.fetchInfiniteQuery({
      ...conversationListQueryOptions(agentInstanceId, context.apiClient),
      staleTime: 0,
    });
    const latestConversation = conversations.pages[0]?.items[0];
    if (latestConversation !== undefined) {
      // oxlint-disable-next-line typescript-eslint/only-throw-error -- TanStack Router's `redirect()` is the documented control-flow signal
      throw redirect({
        to: "/digital-worker/$agentId/collaboration/$conversationId",
        params: {
          agentId: params.agentId,
          conversationId: String(latestConversation.id),
        },
        replace: true,
      });
    }
  },
  component: DwAgentHome,
});

function DwAgentHome(): JSX.Element {
  const { agentId } = Route.useParams();
  const agentInstanceId = Number(agentId);
  const navigate = useNavigate();
  return (
    <DigitalWorkerHome
      agentInstanceId={agentInstanceId}
      onSubmitted={(conversationId) => {
        void navigate({
          to: "/digital-worker/$agentId/collaboration/$conversationId",
          params: {
            agentId: String(agentInstanceId),
            conversationId: String(conversationId),
          },
          // replace: the home is a launch pad — after sending, Back should not
          // return here and re-show the empty composer.
          replace: true,
        });
      }}
    />
  );
}
