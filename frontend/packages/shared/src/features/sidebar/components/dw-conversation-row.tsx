import { useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { type JSX } from "react";

import { ConversationRunStatusSchema } from "../../../schemas/conversation-run-status";
import type { ConversationSummary } from "../../chat/schemas/conversation";
import { NAV_ROW_STATE } from "../constants";

type Props = {
  readonly agentInstanceId: number;
  readonly conversation: ConversationSummary;
  readonly isActive: boolean;
};

export function DwConversationRow({
  agentInstanceId,
  conversation,
  isActive,
}: Props): JSX.Element {
  const { t } = useLingui();
  const isRunning =
    conversation.conversationStatus ===
    ConversationRunStatusSchema.enum.RUNNING;
  const title =
    conversation.title ||
    t({ id: "sidebar.dwConversationNav.untitled", message: "Untitled" });

  return (
    <li>
      <Link
        to="/digital-worker/$agentId/collaboration/$conversationId"
        params={{
          agentId: String(agentInstanceId),
          conversationId: String(conversation.id),
        }}
        aria-current={isActive ? "page" : undefined}
        aria-label={isRunning ? title : undefined}
        data-active={isActive ? true : undefined}
        className={`${NAV_ROW_STATE} flex h-8 min-w-0 items-center rounded-lg px-2 text-sm`}
      >
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {isRunning ? (
          <span
            role="status"
            aria-label={t({
              id: "sidebar.dwConversationNav.runningAriaLabel",
              message: "Conversation running",
            })}
            className="shrink-0"
          >
            <LoaderCircle
              aria-hidden="true"
              className="text-foreground-secondary size-4 animate-spin"
            />
          </span>
        ) : null}
      </Link>
    </li>
  );
}
