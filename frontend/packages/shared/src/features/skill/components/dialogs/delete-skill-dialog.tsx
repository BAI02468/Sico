import { useLingui } from "@lingui/react/macro";
import type { ReactElement } from "react";

import { ConfirmDialog } from "../../../../components/confirm-dialog";

export function DeleteSkillDialog({
  open,
  skillName,
  pending = false,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  skillName: string;
  pending?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}): ReactElement {
  const { t } = useLingui();
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t({ id: "skill.deleteDialog.title", message: "Delete skill" })}
      body={t({
        id: "skill.deleteDialog.description",
        message: `Delete “${skillName}”? This cannot be undone.`,
      })}
      onConfirm={onConfirm}
      pending={pending}
      confirmLabel={t({ id: "common.action.delete", message: "Delete" })}
      pendingLabel={t({
        id: "skill.deleteDialog.deleting",
        message: "Deleting…",
      })}
    />
  );
}
