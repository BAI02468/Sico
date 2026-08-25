import { Trans } from "@lingui/react/macro";
import { DropdownMenuItem } from "@sico/ui";
import type * as React from "react";

type ManageOrganizationMenuItemProps = {
  visible: boolean;
  onSelect: () => void;
};

export function ManageOrganizationMenuItem({
  visible,
  onSelect,
}: ManageOrganizationMenuItemProps): React.JSX.Element | null {
  if (!visible) {
    return null;
  }
  return (
    <DropdownMenuItem onClick={onSelect}>
      <Trans id="sidebar.footer.manageOrganization">Manage Organization</Trans>
    </DropdownMenuItem>
  );
}
