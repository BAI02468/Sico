import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { User } from "lucide-react";
import { memo, type ReactElement } from "react";

import { DwInitialAvatar } from "./dw-initial-avatar";
import { type StudioAgent } from "../schemas/studio-agent";

const OPEN_SETUP_COPY = msg({
  id: "studio.card.openSetup",
  message: "Open {name}'s setup",
});

export type StudioCardProps = {
  agent: StudioAgent;
};

function StudioCardImpl({ agent }: StudioCardProps): ReactElement {
  const { i18n } = useLingui();
  const openSetupLabel = i18n._(
    OPEN_SETUP_COPY.id,
    { name: agent.name },
    OPEN_SETUP_COPY,
  );
  return (
    <Link
      to="/studio/$agentId/setup"
      params={{ agentId: agent.agentId }}
      aria-label={openSetupLabel}
      className="bg-surface-basic border-stroke-subtle-card-rest hover:border-stroke-subtle-card-hover hover:shadow-m active:border-stroke-subtle-card-pressed focus-visible:outline-focus-rest flex h-32 w-full flex-col items-start justify-between rounded-xl border p-5 no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <div className="flex w-full min-w-0 items-center gap-3">
        <DwInitialAvatar name={agent.name} size={40} fontSize={16} decorative />
        <span className="text-foreground-primary min-w-0 flex-1 truncate text-xl leading-tight font-medium">
          {agent.name}
        </span>
      </div>
      <div className="text-foreground-tertiary flex w-full items-center gap-1.5 overflow-hidden">
        <User
          data-testid="creator-icon"
          className="size-3.5 shrink-0"
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-sm leading-tight">
          {agent.creatorUsername}
        </span>
      </div>
    </Link>
  );
}

export const StudioCard = memo(StudioCardImpl);
