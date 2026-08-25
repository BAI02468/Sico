import { useLingui } from "@lingui/react/macro";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@sico/ui";
import { X } from "lucide-react";

import { StudioEditorInviteForm } from "./studio-editor-invite-form";
import { StudioEditorRemovalConfirm } from "./studio-editor-removal-confirm";
import { StudioEditorRoster } from "./studio-editor-roster";
import {
  useStudioEditorInvite,
  useStudioEditorRemoval,
  useStudioEditorRoster,
} from "../hooks/studio-editor-management";

export function StudioManageEditorsDialog({
  agentId,
  creatorUsername,
  open,
  onOpenChange,
}: {
  agentId: string;
  creatorUsername: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const { t } = useLingui();
  const target = { agentId, creatorUsername };
  const roster = useStudioEditorRoster(target, open);
  const invite = useStudioEditorInvite(
    target,
    roster.editors,
    roster.invalidate,
  );
  const removal = useStudioEditorRemoval(agentId, roster.invalidate);
  const mutationPending =
    invite.mutation.isPending || removal.mutation.isPending;
  const inviteDisabled =
    mutationPending || !roster.query.isSuccess || roster.query.isFetching;
  const close = (nextOpen: boolean): void => {
    if (!mutationPending) {
      onOpenChange(nextOpen);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent
          variant="content"
          className="w-130"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>
              {t({
                id: "studio.manageEditors.inviteTitle",
                message: "Invite editor",
              })}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t({
                id: "studio.manageEditors.inviteDescription",
                message: "Invite and manage digital worker editors.",
              })}
            </DialogDescription>
          </DialogHeader>
          <Button
            type="button"
            variant="subtle"
            size="icon-sm"
            className="absolute top-5 right-5"
            aria-label={t({ id: "common.action.close", message: "Close" })}
            disabled={mutationPending}
            onClick={() => close(false)}
          >
            <X aria-hidden />
          </Button>
          <StudioEditorInviteForm
            email={invite.email}
            error={invite.error}
            disabled={inviteDisabled}
            pending={invite.mutation.isPending}
            onEmailChange={invite.setEmail}
            onSubmit={invite.submit}
          />
          <StudioEditorRoster
            creatorUsername={creatorUsername}
            editors={roster.editors}
            isPending={roster.query.isPending}
            isError={roster.query.isError}
            disabled={mutationPending}
            onRetry={() => {
              void roster.query.refetch();
            }}
            onRemove={removal.setEditorToRemove}
          />
        </DialogContent>
      </Dialog>
      <StudioEditorRemovalConfirm
        editor={removal.editorToRemove}
        pending={removal.mutation.isPending}
        onOpenChange={(nextOpen) =>
          !nextOpen && removal.setEditorToRemove(null)
        }
        onConfirm={() =>
          removal.editorToRemove &&
          removal.mutation.mutate(removal.editorToRemove)
        }
      />
    </>
  );
}
