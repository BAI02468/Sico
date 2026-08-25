import { DeviceButton } from "@sico/shared";
import { conversationListQueryOptions } from "@sico/shared/features/chat/index.ts";
import {
  AgentDetailLayout,
  agentQueryOptions,
} from "@sico/shared/features/digital-worker/index.ts";
import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { type JSX } from "react";
import { z } from "zod";

const paramsSchema = z.object({
  agentId: z.coerce.number().int().positive().safe(),
});

// Validate the shared `$agentId` once for the whole subtree. `beforeLoad` sends
// malformed deep links to the 404 boundary; parseParams errors would use the
// route error component instead.
export const Route = createFileRoute("/_authed/digital-worker/$agentId")({
  beforeLoad: ({ params }) => {
    if (!paramsSchema.safeParse(params).success) {
      // oxlint-disable-next-line typescript-eslint/only-throw-error -- TanStack Router's `notFound()` is the documented control-flow signal
      throw notFound();
    }
  },
  // Warm agent detail and the sidebar conversation list without delaying the
  // layout. Child routes await fresh data where it controls write capability.
  loader: ({ context, params }) => {
    const agentId = Number(params.agentId);
    void context.queryClient.prefetchQuery(
      agentQueryOptions(agentId, context.apiClient),
    );
    void context.queryClient.prefetchInfiniteQuery(
      conversationListQueryOptions(agentId, context.apiClient),
    );
  },
  head: () => ({ meta: [{ title: "Digital Worker · SICO" }] }),
  component: DwAgentRoute,
});

function DwAgentRoute(): JSX.Element {
  const { agentId } = Route.useParams();
  return (
    <AgentDetailLayout
      agentId={agentId}
      actions={<DeviceButton agentInstanceId={Number(agentId)} />}
    >
      <Outlet />
    </AgentDetailLayout>
  );
}
