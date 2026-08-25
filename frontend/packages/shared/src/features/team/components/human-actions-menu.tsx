import { useLingui } from "@lingui/react/macro";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@sico/ui";
import { MoreHorizontal, Trash2 } from "lucide-react";
import type * as React from "react";

import { GatedMenuItem } from "../../projects/components/gated-menu-item";

export type HumanActionsMenuProps = {
  canRemove: boolean;
  onRemove: () => void;
};

/** The `···` actions menu. The trigger + menu open for everyone; the Remove item
 * itself is gated — greyed with a reason tooltip for a non-admin. */
export function HumanActionsMenu({
  canRemove,
  onRemove,
}: HumanActionsMenuProps): React.JSX.Element {
  const { t } = useLingui();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="subtle"
            size="icon-sm"
            aria-label={t({
              id: "team.humanRow.memberActions",
              message: "Member actions",
            })}
            className="text-foreground-secondary hover:text-foreground-primary shrink-0"
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="!w-32">
        <GatedMenuItem
          allowed={canRemove}
          variant="destructive"
          onSelect={onRemove}
        >
          <Trash2 className="size-4" />
          {t({ id: "team.humanRow.remove", message: "Remove" })}
        </GatedMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
