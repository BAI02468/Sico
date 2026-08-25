import { Trans } from "@lingui/react/macro";
import { User as UserIcon } from "lucide-react";
import { type JSX } from "react";

import { ConversationModeMenu } from "./conversation-mode-menu";
import { NavItem } from "./nav-item";
import { StandardMenu } from "./standard-menu";
import { type LoginMode } from "../../../components/shell/login-mode-context";
import { NotificationNavItem } from "../../notifications";
import { type ActiveNavState } from "../hooks/use-active-nav";

type Props = {
  readonly mode: LoginMode;
  readonly active: ActiveNavState;
};

// The expanded sidebar's nav-list body — three mutually-exclusive faces:
//   - developer mode → a single Studio entry (no DW workspace);
//   - operator mode inside a DW → conversation mode (its conversation list);
//   - operator mode elsewhere → the standard nav (Notification, Projects, DWs).
// Extracted so `<ExpandedSidebar>` stays flat (no nested ternary) and within the
// function-length budget.
export function SidebarMenu({ mode, active }: Props): JSX.Element {
  if (mode === "developer") {
    return (
      <>
        <NotificationNavItem />
        <NavItem
          to="/studio/all"
          icon={<UserIcon aria-hidden="true" className="size-5" />}
          label={<Trans id="sidebar.menu.studio">Studio</Trans>}
          active={active.isActive("/studio")}
        />
      </>
    );
  }
  // Operator: inside a DW (`/digital-worker/$id/...`) the menu lists that DW's
  // conversations; `active.agentId` (non-null when `nav === "dw"`) is the target.
  if (active.nav === "dw" && active.agentId !== null) {
    return <ConversationModeMenu agentId={active.agentId} />;
  }
  return <StandardMenu active={active} />;
}
