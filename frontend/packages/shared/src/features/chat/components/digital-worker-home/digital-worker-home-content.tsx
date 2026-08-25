import { type JSX, Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { DigitalWorkerHomeHero } from "./digital-worker-home-hero";
import { SuggestedTasks } from "./suggested-tasks";
import { SuggestedTasksSkeleton } from "./suggested-tasks-skeleton";
import { logger } from "../../../../utils/logger";
import { useAgentSuspenseQuery } from "../../../digital-worker/hooks/use-agents-query";
import { isActiveStatus } from "../../../digital-worker/utils/is-active-status";
import { useDigitalWorkerHomeLifecycle } from "../../hooks/use-digital-worker-home-lifecycle";
import { useHomeSubmit } from "../../hooks/use-home-submit";
import { delayStyle, REVEAL_CLASS } from "../../utils/reveal";
import { Composer } from "../composer";
import { Sidepane } from "../sidepane/sidepane";

type Props = {
  agentInstanceId: number;
  // Fired with the freshly-minted conversation id AFTER the message is parked.
  // The consumer navigates to /collaboration/$conversationId, where the parked
  // message is drained and sent. Kept as a callback so @sico/shared owns no
  // route literals.
  onSubmitted: (conversationId: number) => void;
};

// The DW home's content (under the agent-query Suspense boundary owned by
// `DigitalWorkerHome`). `create-first`: on submit the message mints a fresh
// conversation (`POST /conversation`), parks the payload in
// pendingMessageAtom, and navigates to /collaboration/$conversationId,
// where `useConsumePendingMessage` drains and sends it post-reset. The Composer
// is controlled (`value`/`onChange`) so a suggested-task click can prefill it
// and a failed create can restore the text.
export function DigitalWorkerHomeContent({
  agentInstanceId,
  onSubmitted,
}: Props): JSX.Element {
  const { data: agent } = useAgentSuspenseQuery(agentInstanceId);
  const readOnly = !isActiveStatus(agent.status);
  const [draft, setDraft] = useState("");
  const { handleSubmit, submitting } = useHomeSubmit(
    agentInstanceId,
    onSubmitted,
  );
  useDigitalWorkerHomeLifecycle(agentInstanceId);

  return (
    // Flex row so the Sidepane is a sibling that pushes the home content left
    // (inline push, mirrors Collaboration). `min-h-0 flex-1` — NOT `h-full` —
    // matches Collaboration's height model exactly: as the second child of the
    // shared vertical AgentDetailLayout column (Header + this), it takes the space
    // left under the fixed-height Header and, crucially, `min-h-0` lets it shrink
    // below its content's min-height. Without that, an open Sidepane's tall
    // previewer inflates this row and pushes the Header up — and the `h-full`
    // model also left the Header a few px off Collaboration's, so switching
    // between the two flickered. The canvas column's `overflow-y-auto` absorbs
    // any overflow; `min-w-0` lets it shrink past its content when the pane opens.
    <div className="flex min-h-0 w-full flex-1">
      <div className="bg-surface-canvas h-full min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto -mt-16 flex h-full max-w-190 flex-col justify-center px-5">
          <div className={REVEAL_CLASS} style={delayStyle(0)}>
            <DigitalWorkerHomeHero agent={agent} />
          </div>
          <div className={REVEAL_CLASS} style={delayStyle(120)}>
            <Composer
              agentInstanceId={agentInstanceId}
              disabled={readOnly}
              value={draft}
              onChange={setDraft}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          </div>
          {/* Suggested tasks suspend independently: a local boundary keeps the
              hero + composer above usable while they load, and a thrown fetch
              degrades to "no suggestions" (fallback={null}) rather than blanking
              the page. `onError` leaves a diagnostic trail so a broken onboarding
              endpoint isn't silently invisible. */}
          {!readOnly && (
            <ErrorBoundary
              fallback={null}
              onError={(error) => {
                logger.error("chat: recommendation tasks fetch failed", {
                  agentInstanceId,
                  error,
                });
              }}
            >
              <Suspense fallback={<SuggestedTasksSkeleton />}>
                <SuggestedTasks
                  agentInstanceId={agentInstanceId}
                  onSelect={setDraft}
                />
              </Suspense>
            </ErrorBoundary>
          )}
        </div>
      </div>
      {/* Bare sibling: open, the panel's own w-3/4 is its flex basis and the
          canvas column's flex-1 absorbs the rest; closed, it animates to a w-0
          shell so the home reclaims the full row. */}
      <Sidepane />
    </div>
  );
}
