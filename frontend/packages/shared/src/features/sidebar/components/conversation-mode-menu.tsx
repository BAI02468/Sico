import { type JSX, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { DwConversationNav } from "./dw-conversation-nav";
import { DwConversationNavSkeleton } from "./dw-conversation-nav-skeleton";
import { logger } from "../../../utils/logger";
import { useAgentQuery } from "../../digital-worker/hooks/use-agents-query";
import { isActiveStatus } from "../../digital-worker/utils/is-active-status";

type Props = {
  readonly agentId: string;
};

// The DW conversation-mode menu (Figma 20454:59481), shown in the expanded
// sidebar while inside a Digital Worker. The conversation list is a SUSPENSE
// read wrapped in a local <Suspense> (skeleton) + <ErrorBoundary>. On failure it
// degrades to nothing (`fallback={null}`) rather than an inline message —
// `onError` leaves a diagnostic trail so a broken list endpoint isn't silently
// invisible. `resetKeys={[agentId]}` re-arms the boundary on a DW switch: without
// it, one agent's failed fetch leaves this (non-remounting) boundary stuck on
// `null`, blanking the list for every subsequently-viewed DW until a full sidebar
// remount.
export function ConversationModeMenu({ agentId }: Props): JSX.Element {
  const agentInstanceId = Number(agentId);
  const { data: agent } = useAgentQuery(agentInstanceId);
  return (
    <ErrorBoundary
      fallback={null}
      resetKeys={[agentId]}
      onError={(error) => {
        logger.error("chat: conversation list fetch failed", {
          agentId,
          error,
        });
      }}
    >
      <Suspense fallback={<DwConversationNavSkeleton />}>
        <DwConversationNav
          agentInstanceId={agentInstanceId}
          readOnly={!isActiveStatus(agent?.status)}
        />
      </Suspense>
    </ErrorBoundary>
  );
}
