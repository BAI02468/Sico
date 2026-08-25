import { useLingui } from "@lingui/react/macro";
import { Box, User as UserIcon } from "lucide-react";
import { type JSX } from "react";

import { RailConversationBody } from "./rail-conversation-body";
import { RailDwList } from "./rail-dw-list";
import { RailNavItem } from "./rail-nav-item";
import { NotificationNavItem } from "../../notifications";
import { type ActiveNavState } from "../hooks/use-active-nav";
import { useRouteMode } from "../hooks/use-route-mode";

// The collapsed rail's icon column has three mutually exclusive faces. Split
// into its own file (rather than an inline nested ternary or a same-file second
// component) to satisfy both `no-nested-ternary` and `no-multi-comp` while
// keeping each function under the line cap. The operator workspace face renders
// the Notification rail row inline; the developer studio is a single-entry face.
export function RailBody({
  active,
}: {
  readonly active: ActiveNavState;
}): JSX.Element {
  const { t } = useLingui();
  const { nav, agentId } = active;
  const mode = useRouteMode();

  if (mode === "developer") {
    return (
      <>
        <NotificationNavItem />
        <RailNavItem
          to="/studio/all"
          label={t({ id: "sidebar.rail.studio", message: "Studio" })}
          icon={<UserIcon aria-hidden="true" className="size-5" />}
          active={active.isActive("/studio")}
        />
      </>
    );
  }

  if (nav === "dw" && agentId !== null) {
    return <RailConversationBody agentId={agentId} />;
  }

  return (
    <>
      <NotificationNavItem />
      <RailNavItem
        to="/project"
        label={t({ id: "sidebar.rail.projects", message: "Projects" })}
        icon={<Box aria-hidden="true" className="size-5" />}
        active={nav === "project"}
      />
      <RailNavItem
        to="/digital-worker"
        label={t({
          id: "sidebar.rail.digitalWorkers",
          message: "Digital Workers",
        })}
        icon={<UserIcon aria-hidden="true" className="size-5" />}
        active={nav === "dw" && agentId === null}
      />

      <RailDwList />
    </>
  );
}
