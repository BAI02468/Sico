import { useLingui } from "@lingui/react/macro";
import { toast } from "@sico/ui";

import { ConfirmDialog } from "../../../components/confirm-dialog";
import { useDeleteSingleAgentMutation } from "../hooks/use-single-agent-mutations";

export function StudioDeleteAgentDialog({
  agentId,
  agentName,
  open,
  onOpenChange,
  onDeleted,
}: {
  agentId: string;
  agentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}): React.JSX.Element {
  const { t } = useLingui();
  const deleteAgent = useDeleteSingleAgentMutation();
  const remove = (): void => {
    deleteAgent.mutate(agentId, {
      onSuccess: () => {
        toast.success(
          t({
            id: "studio.deleteDialog.success",
            message: "Digital worker deleted.",
          }),
          { invert: true },
        );
        onDeleted();
      },
      onError: () =>
        toast.error(
          t({
            id: "studio.deleteDialog.failed",
            message: "Couldn't delete this digital worker.",
          }),
        ),
    });
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen || !deleteAgent.isPending) {
          onOpenChange(nextOpen);
        }
      }}
      title={t({
        id: "studio.deleteDialog.title",
        message: "Delete digital worker",
      })}
      body={t({
        id: "studio.deleteDialog.description",
        message: `Delete “${agentName}”? This cannot be undone.`,
      })}
      onConfirm={remove}
      pending={deleteAgent.isPending}
      confirmLabel={t({ id: "common.action.delete", message: "Delete" })}
      pendingLabel={t({
        id: "studio.deleteDialog.deleting",
        message: "Deleting…",
      })}
    />
  );
}
