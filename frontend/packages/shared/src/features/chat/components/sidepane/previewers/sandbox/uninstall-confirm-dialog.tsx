import { useLingui } from "@lingui/react/macro";
import { type JSX } from "react";

import { ConfirmDialog } from "../../../../../../components/confirm-dialog";

export type UninstallConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Whether the uninstall targets every device (changes the copy + scope).
  forAllDevices: boolean;
  // Fires on confirm; the dialog does NOT self-close — the consumer closes it
  // once the uninstall mutation settles.
  onConfirm: () => void;
  pending?: boolean;
};

export function UninstallConfirmDialog({
  open,
  onOpenChange,
  forAllDevices,
  onConfirm,
  pending = false,
}: UninstallConfirmDialogProps): JSX.Element {
  const { t } = useLingui();
  const title = forAllDevices
    ? t({
        id: "chat.uninstallConfirmDialog.titleAllDevices",
        message: "Uninstall this app for all devices?",
      })
    : t({
        id: "chat.uninstallConfirmDialog.titleCurrentDevice",
        message: "Uninstall this app?",
      });
  const body = forAllDevices
    ? t({
        id: "chat.uninstallConfirmDialog.bodyAllDevices",
        message:
          "This app will be removed from all devices. This action cannot be undone.",
      })
    : t({
        id: "chat.uninstallConfirmDialog.bodyCurrentDevice",
        message: "This app will be removed from this device.",
      });
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      body={body}
      onConfirm={onConfirm}
      pending={pending}
      confirmLabel={t({
        id: "chat.uninstallConfirmDialog.uninstall",
        message: "Uninstall",
      })}
      pendingLabel={t({
        id: "chat.uninstallConfirmDialog.uninstalling",
        message: "Uninstalling…",
      })}
    />
  );
}
