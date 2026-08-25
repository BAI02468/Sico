import { Trans } from "@lingui/react/macro";
import { DropdownMenuItem } from "@sico/ui";
import type * as React from "react";

type SwitchToSicoDevMenuItemProps = {
  visible: boolean;
  onSelect: () => void;
};

export function SwitchToSicoDevMenuItem({
  visible,
  onSelect,
}: SwitchToSicoDevMenuItemProps): React.JSX.Element | null {
  if (!visible) {
    return null;
  }
  return (
    <DropdownMenuItem onClick={onSelect}>
      <Trans id="sidebar.footer.goToSicoDev">Go to SICO.Dev</Trans>
    </DropdownMenuItem>
  );
}
