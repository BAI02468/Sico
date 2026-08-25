import { useLingui } from "@lingui/react/macro";
import { Button } from "@sico/ui";
import { PanelLeftOpen } from "lucide-react";
import { type JSX } from "react";

import { RailBody } from "./rail-body";
import sicoLogo from "../../../assets/sico-logo.svg";
import { type ActiveNavState } from "../hooks/use-active-nav";

export function CollapsedRail({
  active,
  onExpand,
}: {
  readonly active: ActiveNavState;
  readonly onExpand: () => void;
}): JSX.Element {
  const { t } = useLingui();
  return (
    <div
      data-testid="sidebar-rail"
      className="flex flex-1 flex-col items-start gap-1 px-1 py-1.5"
    >
      <div className="group relative flex size-9 items-center justify-center">
        {/* Reuse the expanded logo asset and clip to just the figure-8
            mark (left 20px of the 60×20 viewBox). Sharing one src with
            the expanded sidebar means the image is already cached when
            toggling, so the mark never flashes blank on collapse. On hover
            the mark swaps to the expand button. */}
        <span className="size-5 overflow-hidden group-focus-within:opacity-0 group-hover:opacity-0">
          <img src={sicoLogo} alt="SICO" className="h-5 w-auto max-w-none" />
        </span>
        <Button
          variant="subtle"
          size="icon-lg"
          aria-label={t({
            id: "sidebar.collapsed.expand",
            message: "Expand sidebar",
          })}
          onClick={onExpand}
          className="absolute opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
        >
          <PanelLeftOpen aria-hidden="true" />
        </Button>
      </div>

      <RailBody active={active} />
    </div>
  );
}
