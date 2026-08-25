import { useLingui } from "@lingui/react/macro";
import { Button } from "@sico/ui";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import { type JSX } from "react";

import { SidebarMenu } from "./sidebar-menu";
import sicoDevLogo from "../../../assets/sico-dev-logo.svg";
import sicoLogo from "../../../assets/sico-logo.svg";
import { type ActiveNavState } from "../hooks/use-active-nav";
import { useRouteMode } from "../hooks/use-route-mode";

/**
 * Expanded (non-collapsed) sidebar body: top bar (logo + collapse toggle) and
 * the nav list. The list has three faces (see `SidebarMenu`): developer studio,
 * operator conversation mode (inside a DW, Figma 20454:59481), or the standard
 * operator nav. Extracted from `<Sidebar>` so each variant stays within the
 * function-length budget — mirrors legacy's Expanded/Collapsed split.
 */
export function ExpandedSidebar({
  active,
  onToggleCollapse,
}: {
  readonly active: ActiveNavState;
  readonly onToggleCollapse: () => void;
}): JSX.Element {
  const { t } = useLingui();
  const mode = useRouteMode();
  return (
    <>
      {/* Top bar — Figma node 13713:78816. */}
      <div className="flex h-11 items-center justify-between px-2">
        <span data-testid="sidebar-logo" className="flex items-center gap-1">
          {/* Developer mode swaps the SICO wordmark for SICO.Dev, mirroring
              legacy dwp. The mark is identical in both; only the wordmark
              differs, so the collapsed rail (mark only) stays mode-agnostic. */}
          {mode === "developer" ? (
            <img src={sicoDevLogo} alt="SICO.Dev" className="h-5 w-auto" />
          ) : (
            <img src={sicoLogo} alt="SICO" className="h-5 w-auto" />
          )}
        </span>
        <Button
          variant="subtle"
          size="icon"
          aria-label={t({
            id: "sidebar.expanded.collapse",
            message: "Collapse sidebar",
          })}
          onClick={onToggleCollapse}
          className="group"
        >
          <PanelLeft aria-hidden="true" className="group-hover:hidden" />
          <PanelLeftClose
            aria-hidden="true"
            className="hidden group-hover:block"
          />
        </Button>
      </div>

      {/* Menu list — Figma node 13713:78826 (standard) / 20454:59481 (chat). */}
      <div
        data-testid="sidebar-nav-list"
        className="flex flex-1 flex-col gap-1 overflow-y-auto p-2"
      >
        <SidebarMenu mode={mode} active={active} />
      </div>
    </>
  );
}
