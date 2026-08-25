import { useLingui } from "@lingui/react/macro";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@sico/ui";
import { ArrowUp, Download, MoreHorizontal, Trash2 } from "lucide-react";
import type { ReactElement } from "react";

export function SkillActionsMenu({
  editable = true,
  onReplace,
  onDownloadZip,
  onDelete,
}: {
  editable?: boolean;
  onReplace: () => void;
  onDownloadZip: () => void;
  onDelete: () => void;
}): ReactElement {
  const { t } = useLingui();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="subtle"
            size="icon"
            aria-label={t({
              id: "skill.skillActionsMenu.actions",
              message: "Actions",
            })}
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="shadow-l min-w-40 rounded-lg p-1"
      >
        <DropdownMenuItem disabled={!editable} onClick={onReplace}>
          <ArrowUp />
          {t({ id: "skill.skillActionsMenu.replace", message: "Replace" })}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDownloadZip}>
          <Download />
          {t({
            id: "skill.skillActionsMenu.downloadZip",
            message: "Download ZIP",
          })}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!editable} onClick={onDelete}>
          <Trash2 />
          {t({ id: "skill.skillActionsMenu.delete", message: "Delete" })}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
