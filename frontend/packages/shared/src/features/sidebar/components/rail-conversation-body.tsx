import { useLingui } from "@lingui/react/macro";
import { Button } from "@sico/ui";
import { Link } from "@tanstack/react-router";
import { MessageCirclePlus, User as UserIcon } from "lucide-react";
import { type JSX } from "react";

import { RailNavItem } from "./rail-nav-item";
import { RailNavRow } from "./rail-nav-row";
import { useAgentQuery } from "../../digital-worker/hooks/use-agents-query";
import { isActiveStatus } from "../../digital-worker/utils/is-active-status";

export function RailConversationBody({
  agentId,
}: {
  agentId: string;
}): JSX.Element {
  const { t } = useLingui();
  const { data: agent } = useAgentQuery(Number(agentId));
  const readOnly = !isActiveStatus(agent?.status);
  const newSessionLabel = t({
    id: "sidebar.rail.newSession",
    message: "New session",
  });

  return (
    <>
      <RailNavItem
        to="/digital-worker"
        label={t({
          id: "sidebar.rail.backToDigitalWorkers",
          message: "Back to Digital Workers",
        })}
        icon={<UserIcon aria-hidden="true" className="size-5" />}
        active={false}
      />
      <RailNavRow
        icon={<MessageCirclePlus aria-hidden="true" className="size-5" />}
        render={
          readOnly ? (
            <Button
              type="button"
              variant="subtle"
              size="icon-lg"
              disabled
              aria-label={newSessionLabel}
            />
          ) : (
            <Link
              to="/digital-worker/$agentId"
              params={{ agentId }}
              aria-label={newSessionLabel}
            />
          )
        }
      />
    </>
  );
}
