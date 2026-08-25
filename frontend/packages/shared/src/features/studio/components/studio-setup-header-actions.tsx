import { useLingui } from "@lingui/react/macro";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@sico/ui";
import { MoreHorizontal, Settings2, Trash2 } from "lucide-react";

import { GatedMenuItem } from "../../projects/components/gated-menu-item";

export function StudioSetupHeaderActions({
  canManageEditors,
  canDelete,
  onManageEditors,
  onDelete,
}: {
  canManageEditors: boolean;
  canDelete: boolean;
  onManageEditors?: () => void;
  onDelete?: () => void;
}): React.JSX.Element {
  const { t } = useLingui();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="subtle"
            size="icon-xs"
            aria-label={t({
              id: "studio.setupHeader.moreActions",
              message: "More setup actions",
            })}
          />
        }
      >
        <MoreHorizontal aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-w-48 min-w-40">
        <GatedMenuItem
          allowed={canManageEditors}
          onSelect={() => onManageEditors?.()}
        >
          <Settings2 className="size-4" aria-hidden />
          {t({
            id: "studio.setupHeader.manageEditors",
            message: "Manage editors",
          })}
        </GatedMenuItem>
        <GatedMenuItem
          allowed={canDelete}
          variant="destructive"
          onSelect={() => onDelete?.()}
        >
          <Trash2 className="size-4" aria-hidden />
          <span className="truncate">
            {t({
              id: "studio.setupHeader.delete",
              message: "Delete digital worker",
            })}
          </span>
        </GatedMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
