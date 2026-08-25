import { useLingui } from "@lingui/react/macro";
import { toast } from "@sico/ui";
import type { ReactElement } from "react";

import { PublishAccessDialog } from "./publish-access-dialog";
import { usePublishSingleAgentMutation } from "../hooks/use-single-agent-mutations";
import type { PublishAccess } from "../schemas/publish-single-agent";

export function StudioPublishDialog({
  agentId,
  open,
  onOpenChange,
}: {
  agentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): ReactElement {
  const { t } = useLingui();
  const publishAgent = usePublishSingleAgentMutation();
  const publish = (access: PublishAccess): void => {
    publishAgent.mutate(
      { agentId, access },
      {
        onSuccess: () => {
          toast.success(
            t({
              id: "studio.publishDialog.success",
              message: "Digital worker published.",
            }),
            { invert: true },
          );
          onOpenChange(false);
        },
        onError: () =>
          toast.error(
            t({
              id: "studio.publishDialog.failed",
              message: "Couldn't publish this digital worker.",
            }),
          ),
      },
    );
  };

  return (
    <PublishAccessDialog
      open={open}
      pending={publishAgent.isPending}
      onOpenChange={onOpenChange}
      onPublish={publish}
    />
  );
}
