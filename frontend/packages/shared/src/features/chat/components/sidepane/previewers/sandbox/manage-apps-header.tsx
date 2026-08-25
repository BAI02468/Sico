import { useLingui } from "@lingui/react/macro";
import { Button } from "@sico/ui";
import { ArrowLeft, Maximize, Minimize, X } from "lucide-react";
import { type JSX } from "react";

import { useSidepane } from "../../../../hooks/use-sidepane";

// Manage-apps panel header: a back button to the device view + the "Devices"
// label on the left; the maximize/restore + close controls on the right, wired
// straight to useSidepane() (same contract as SidepaneHeader — this drill-in
// sub-view needs the back affordance the shared header has no slot for, so it
// mirrors the header's acrylic framing and right-side controls locally).
export function ManageAppsHeader({
  onBack,
}: {
  onBack: () => void;
}): JSX.Element {
  const { t } = useLingui();
  const { maximized, close, toggleMaximize } = useSidepane();
  const MaximizeGlyph = maximized ? Minimize : Maximize;
  const maximizeLabel = maximized
    ? t({ id: "chat.manageAppsHeader.restore", message: "Restore" })
    : t({ id: "chat.manageAppsHeader.maximize", message: "Maximize" });

  return (
    <div className="bg-surface-acrylic-board sticky top-0 z-10 flex items-center justify-between gap-2 px-4 pt-4 pb-2 backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-1">
        <Button
          variant="subtle"
          size="icon-xs"
          aria-label={t({
            id: "chat.manageAppsHeader.backToDevice",
            message: "Back to device",
          })}
          onClick={onBack}
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
        <span className="text-foreground-primary text-sm font-medium">
          {t({ id: "chat.manageAppsHeader.devices", message: "Devices" })}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="subtle"
          size="icon-xs"
          aria-label={maximizeLabel}
          onClick={toggleMaximize}
        >
          <MaximizeGlyph />
        </Button>
        <div
          className="border-divider h-3 w-px shrink-0 border-l"
          aria-hidden
        />
        <Button
          type="button"
          variant="subtle"
          size="icon-xs"
          aria-label={t({
            id: "chat.manageAppsHeader.close",
            message: "Close",
          })}
          onClick={close}
        >
          <X />
        </Button>
      </div>
    </div>
  );
}
