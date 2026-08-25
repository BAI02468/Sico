import { Trans } from "@lingui/react/macro";
import { Box } from "lucide-react";
import { type JSX } from "react";

import { DwSection } from "./dw-section";
import { NavItem } from "./nav-item";
import { NotificationNavItem } from "../../notifications";
import { type ActiveNavState } from "../hooks/use-active-nav";

type Props = {
  readonly active: ActiveNavState;
};

// The standard expanded-sidebar menu: Notification, Projects, and the Digital
// Workers group (list preview). Shown
// when NOT inside a specific Digital Worker (where the sidebar switches to
// conversation mode instead).
export function StandardMenu({ active }: Props): JSX.Element {
  const { nav } = active;
  return (
    <>
      <NotificationNavItem />
      <NavItem
        to="/project"
        icon={<Box aria-hidden="true" className="size-5" />}
        label={<Trans id="sidebar.standardMenu.projects">Projects</Trans>}
        active={nav === "project"}
      />
      {/* Extra top gap sets the Digital Workers group apart from the nav rows
          above so its list preview doesn't read as another row. */}
      <div className="mt-2">
        <DwSection />
      </div>
    </>
  );
}
