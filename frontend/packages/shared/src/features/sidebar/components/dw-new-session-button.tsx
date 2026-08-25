import { Trans } from "@lingui/react/macro";
import { Button } from "@sico/ui";
import { Link } from "@tanstack/react-router";
import { MessageCirclePlus } from "lucide-react";
import { type JSX } from "react";

type Props = {
  readonly agentInstanceId: number;
  readonly disabled: boolean;
};

export function DwNewSessionButton({
  agentInstanceId,
  disabled,
}: Props): JSX.Element {
  const content = (
    <>
      <MessageCirclePlus aria-hidden="true" />
      <span className="truncate">
        <Trans id="sidebar.dwConversationNav.newSession">New session</Trans>
      </span>
    </>
  );

  if (disabled) {
    return (
      <Button variant="secondary" size="lg" className="w-full" disabled>
        {content}
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      size="lg"
      className="w-full"
      nativeButton={false}
      render={
        <Link
          to="/digital-worker/$agentId"
          params={{ agentId: String(agentInstanceId) }}
        />
      }
    >
      {content}
    </Button>
  );
}
