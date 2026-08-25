import { Trans, useLingui } from "@lingui/react/macro";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@sico/ui";
import { Loader2, X } from "lucide-react";
import { type FormEventHandler, type JSX } from "react";
import { type Control } from "react-hook-form";

import { CreateStudioAgentDialogFields } from "./create-studio-agent-dialog-fields";
import { type LoadState } from "../../digital-worker/utils/load-state";
import { type SetupBasicInfoValues } from "../../skill/components/setup/setup-basic-info-values";
import { type Role } from "../../skill/schemas/roles";

export type CreateStudioAgentDialogViewProps = {
  open: boolean;
  pending: boolean;
  canSubmit: boolean;
  control: Control<SetupBasicInfoValues>;
  roles: Role[];
  rolesState: LoadState;
  organizationState: LoadState;
  onOpenChange: (open: boolean) => void;
  onRetryRoles: () => void;
  onRetryOrganization: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function CreateStudioAgentDialogView({
  open,
  pending,
  canSubmit,
  control,
  roles,
  rolesState,
  organizationState,
  onOpenChange,
  onRetryRoles,
  onRetryOrganization,
  onSubmit,
}: CreateStudioAgentDialogViewProps): JSX.Element {
  const { t } = useLingui();
  const handleOpenChange = (next: boolean): void => {
    if (next || !pending) {
      onOpenChange(next);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        variant="content"
        className="w-150"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>
            <Trans id="studio.createDialog.title">
              Create new Digital Worker role
            </Trans>
          </DialogTitle>
          <DialogDescription className="sr-only">
            <Trans id="studio.createDialog.description">
              Enter the Digital Worker&apos;s basic information.
            </Trans>
          </DialogDescription>
        </DialogHeader>
        <Button
          type="button"
          variant="subtle"
          size="icon-sm"
          className="absolute top-5 right-5"
          aria-label={t({ id: "common.action.close", message: "Close" })}
          disabled={pending}
          onClick={() => handleOpenChange(false)}
        >
          <X aria-hidden />
        </Button>
        <form noValidate onSubmit={onSubmit}>
          <CreateStudioAgentDialogFields
            control={control}
            roles={roles}
            rolesState={rolesState}
            organizationState={organizationState}
            roleDisabled={pending || rolesState !== "ready"}
            nameDisabled={pending}
            onRetryRoles={onRetryRoles}
            onRetryOrganization={onRetryOrganization}
          />
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="subtle"
              disabled={pending}
              onClick={() => handleOpenChange(false)}
            >
              <Trans id="common.action.cancel">Cancel</Trans>
            </Button>
            <Button
              type="submit"
              variant="primary"
              aria-busy={pending}
              disabled={pending || !canSubmit}
            >
              {pending ? <Loader2 className="animate-spin" /> : null}
              {pending ? (
                <Trans id="common.status.saving">Saving…</Trans>
              ) : (
                <Trans id="studio.createDialog.continue">Continue</Trans>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
