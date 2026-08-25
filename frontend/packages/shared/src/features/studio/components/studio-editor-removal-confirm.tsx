import { useLingui } from "@lingui/react/macro";

import { ConfirmDialog } from "../../../components/confirm-dialog";
import type { RbacUser } from "../../rbac/schemas/user-role";

export function StudioEditorRemovalConfirm({
  editor,
  pending,
  onOpenChange,
  onConfirm,
}: {
  editor: RbacUser | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}): React.JSX.Element {
  const { t } = useLingui();
  return (
    <ConfirmDialog
      open={editor !== null}
      onOpenChange={onOpenChange}
      title={t({
        id: "studio.manageEditors.removeTitle",
        message: "Remove editor",
      })}
      body={t({
        id: "studio.manageEditors.removeDescription",
        message: `Remove ${editor?.email ?? ""} as an editor?`,
      })}
      onConfirm={onConfirm}
      pending={pending}
      confirmLabel={t({ id: "common.action.remove", message: "Remove" })}
      pendingLabel={t({
        id: "studio.manageEditors.removing",
        message: "Removing…",
      })}
    />
  );
}
