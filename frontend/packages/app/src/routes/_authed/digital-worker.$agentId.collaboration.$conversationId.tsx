import { Collaboration } from "@sico/shared";
import {
  conversationDetailQueryOptions,
  historyQueryOptions,
} from "@sico/shared/features/chat/index.ts";
import { agentQueryOptions } from "@sico/shared/features/digital-worker/index.ts";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { type JSX } from "react";
import { z } from "zod";

const conversationParamsSchema = z.object({
  conversationId: z.coerce.number().int().positive().safe(),
});

// The chat for one conversation of a Digital Worker. <Collaboration> fetches
// history NON-suspense (a failure toasts in-place, never replacing the message
// list or Composer), so the route is a thin mount.
export const Route = createFileRoute(
  "/_authed/digital-worker/$agentId/collaboration/$conversationId",
)({
  // The parent validates agentId for this entire subtree. A malformed
  // conversationId under a valid agent returns to that agent's home.
  beforeLoad: ({ params }) => {
    if (!conversationParamsSchema.safeParse(params).success) {
      // oxlint-disable-next-line typescript-eslint/only-throw-error -- TanStack Router's `redirect()` is the documented control-flow signal
      throw redirect({
        to: "/digital-worker/$agentId",
        params: { agentId: params.agentId },
        replace: true,
      });
    }
  },
  // Await fresh agent state before mounting any send/reconnect side effects.
  // Conversation detail and history remain optional fire-and-forget prefetches.
  loader: async ({ context, params }) => {
    const agentId = Number(params.agentId);
    const conversationId = Number(params.conversationId);
    await context.queryClient.fetchQuery({
      ...agentQueryOptions(agentId, context.apiClient),
      staleTime: 0,
    });
    void context.queryClient.prefetchQuery(
      conversationDetailQueryOptions(conversationId, context.apiClient),
    );
    void context.queryClient.prefetchInfiniteQuery(
      historyQueryOptions(agentId, context.apiClient, conversationId),
    );
  },
  component: DwAgentConversation,
});

function DwAgentConversation(): JSX.Element {
  const { agentId, conversationId } = Route.useParams();
  return (
    <Collaboration
      agentInstanceId={Number(agentId)}
      conversationId={Number(conversationId)}
    />
  );
}
