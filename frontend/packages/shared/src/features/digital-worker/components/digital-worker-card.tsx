import { useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";
import { memo, type ReactElement } from "react";

import {
  DwStatusIndicator,
  type DwStatusIndicatorProps,
  resolveStatusIndicator,
} from "./dw-status-indicator";
import { Card } from "../../../components/card";
import { DwAvatar } from "../../../components/dw-avatar";
import { type Agent, AgentStatusSchema } from "../schemas/agent";

export type DigitalWorkerCardProps = {
  agent: Agent;
};

// Inner content shared by every click-affordance branch of the card: avatar,
// name, optional NEW dot + status indicator, role, and the project row. A plain
// render function (not a component) so this file keeps a single component for
// `react/no-multi-comp`.
function renderCardContent(
  agent: Agent,
  showNewDot: boolean,
  indicator: DwStatusIndicatorProps | undefined,
): ReactElement {
  return (
    <>
      <div className="flex w-full items-center justify-between gap-2">
        <DwAvatar agent={agent} decorative />
        <div className="flex min-w-0 flex-1 flex-col justify-center pl-3">
          <div className="flex w-full items-center gap-1.5">
            <span className="text-foreground-primary truncate text-xl leading-tight font-medium">
              {agent.name}
            </span>
            {showNewDot ? (
              <span
                data-testid="new-status-dot"
                aria-hidden
                className="bg-primary-600 size-1.5 shrink-0 rounded-full"
              />
            ) : null}
            {indicator ? (
              <span className="ml-auto pl-2">
                <DwStatusIndicator
                  tone={indicator.tone}
                  label={indicator.label}
                />
              </span>
            ) : null}
          </div>
          {agent.role ? (
            <span className="text-foreground-tertiary w-full truncate text-sm leading-tight">
              {agent.role}
            </span>
          ) : null}
        </div>
      </div>
      {agent.project?.name ? (
        <div className="text-foreground-tertiary flex w-full items-center gap-1.5 overflow-hidden">
          <Briefcase
            data-testid="workspace-icon"
            className="size-3.5 shrink-0"
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate text-sm leading-tight">
            {agent.project.name}
          </span>
        </div>
      ) : null}
    </>
  );
}

/**
 * Card for a single Digital Worker with the lifecycle/execution presentation
 * selected by `resolveStatusIndicator` and an independent NEW lifecycle dot.
 */
function DigitalWorkerCardImpl({
  agent,
}: DigitalWorkerCardProps): ReactElement {
  const { t } = useLingui();
  // Centralize lifecycle/execution precedence in the resolver; the card only
  // localizes and positions the selected presentation.
  const status = agent.status;
  const meta = resolveStatusIndicator(status, agent.conversationStatus);
  // Resolve the label descriptor here (component subscribes to Lingui) so the
  // status text re-renders on locale switch.
  const indicator = meta
    ? { tone: meta.tone, label: t(meta.label) }
    : undefined;
  const showNewDot = status === AgentStatusSchema.enum.NEW;

  const inner = renderCardContent(agent, showNewDot, indicator);

  return (
    <Card asChild className="h-32 justify-between">
      <Link
        to="/digital-worker/$agentId"
        params={{ agentId: String(agent.id) }}
        aria-label={`Open ${agent.name}`}
      >
        {inner}
      </Link>
    </Card>
  );
}

export const DigitalWorkerCard = memo(DigitalWorkerCardImpl);
