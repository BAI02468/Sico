import {
  Button,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@sico/ui";
import { Ellipsis, PlusIcon, Trash2 } from "lucide-react";
import { type JSX } from "react";

type Props = {
  actionsLabel: string;
  createLabel?: string;
  deleteLabel: string;
  onCreate: () => void;
  onDelete?: () => void;
  title: string;
};

export function ScheduledTasksDialogHeader({
  actionsLabel,
  createLabel,
  deleteLabel,
  onCreate,
  onDelete,
  title,
}: Props): JSX.Element {
  return (
    <DialogHeader className="flex-row items-center justify-between gap-4">
      <DialogTitle>{title}</DialogTitle>
      <div className="flex items-center gap-2">
        {createLabel ? (
          <Button type="button" variant="subtle" size="sm" onClick={onCreate}>
            <PlusIcon />
            {createLabel}
          </Button>
        ) : null}
        {onDelete ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="subtle"
                  size="icon-sm"
                  aria-label={actionsLabel}
                />
              }
            >
              <Ellipsis aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 aria-hidden="true" />
                {deleteLabel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </DialogHeader>
  );
}
