import { zodResolver } from "@hookform/resolvers/zod";
import { useLingui } from "@lingui/react/macro";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FieldGroup,
  toast,
} from "@sico/ui";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import type * as React from "react";
import { useForm } from "react-hook-form";

import {
  ASSIGN_DEVICE_INITIAL_VALUES,
  assignDeviceSchema,
  type AssignDeviceValues,
} from "./assign-device-fields";
import { DwField } from "./dw-field";
import { apiErrorMessage } from "../../../utils/api-error-message";
import { type Device } from "../../devices";
import {
  useAgentsQuery,
  useDedupedAgents,
} from "../../digital-worker/hooks/use-agents-query";
import { useAssignDeviceMutation } from "../hooks/use-assign-device-mutation";

export type AssignDeviceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  // The device being assigned; null when the dialog is closed.
  device: Device | null;
};

type AssignDeviceCopy = {
  loadError: string;
  success: string;
  assignError: string;
  title: string;
  cancel: string;
  assigning: string;
  assign: string;
};

function useAssignDeviceCopy(): AssignDeviceCopy {
  const { t } = useLingui();
  return {
    loadError: t({
      id: "sandboxDevices.assignDialog.error.loadWorkers",
      message: "We couldn't load digital workers. Try reopening the dialog.",
    }),
    success: t({
      id: "sandboxDevices.assignDialog.success",
      message: "Device assigned.",
    }),
    assignError: t({
      id: "sandboxDevices.assignDialog.error.assign",
      message: "We couldn't assign the device.",
    }),
    title: t({
      id: "sandboxDevices.assignDialog.title",
      message: "Assign device",
    }),
    cancel: t({ id: "common.action.cancel", message: "Cancel" }),
    assigning: t({
      id: "sandboxDevices.assignDialog.assigning",
      message: "Assigning…",
    }),
    assign: t({ id: "sandboxDevices.assignDialog.assign", message: "Assign" }),
  };
}

/** Controlled dialog binding a sandbox device to a Digital Worker instance.
 * RHF + zodResolver + `@sico/ui` `Field` primitives (mirrors CreateProjectDialog);
 * one Select sourced from the project-scoped agents list (so only THIS project's
 * DWs are assignable — the sandbox pool is org→project bound). */
export function AssignDeviceDialog({
  open,
  onOpenChange,
  projectId,
  device,
}: AssignDeviceDialogProps): React.JSX.Element {
  const copy = useAssignDeviceCopy();
  const form = useForm<AssignDeviceValues>({
    resolver: zodResolver(assignDeviceSchema),
    defaultValues: ASSIGN_DEVICE_INITIAL_VALUES,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  // The assignable DWs are this project's agents (backend-filtered by projectId).
  const agentsQuery = useAgentsQuery({ projectId });
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = agentsQuery;
  // Drain every page so a project with >50 workers doesn't drop the tail from
  // the dropdown (mirrors MembersDwTab).
  useEffect(() => {
    if (open && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [open, hasNextPage, isFetchingNextPage, fetchNextPage]);
  const agents = useDedupedAgents(agentsQuery.data?.pages);
  const mutation = useAssignDeviceMutation(projectId);

  useEffect(() => {
    if (open) {
      form.reset(ASSIGN_DEVICE_INITIAL_VALUES);
    }
  }, [open, form]);

  // Dialog operations surface load failures as a toast (not inline) — the DW
  // dropdown just can't be populated, so tell the user why on open.
  const agentsError = open && agentsQuery.isError;
  useEffect(() => {
    if (agentsError) {
      toast.error(copy.loadError);
    }
  }, [agentsError, copy.loadError]);

  const onSubmit = (values: AssignDeviceValues): void => {
    if (!device) {
      return;
    }
    mutation.mutate(
      { instanceId: values.instanceId, sandboxId: device.sandboxId },
      {
        onSuccess: () => {
          toast.success(copy.success, { invert: true });
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(apiErrorMessage(error, copy.assignError));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="content" className="w-120">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <DwField
              control={form.control}
              agents={agents}
              disabled={agentsQuery.isPending || agentsQuery.isError}
              isPending={agentsQuery.isPending}
            />
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="subtle"
              onClick={() => onOpenChange(false)}
            >
              {copy.cancel}
            </Button>
            <Button
              type="submit"
              variant="primary"
              aria-busy={mutation.isPending}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
              {mutation.isPending ? copy.assigning : copy.assign}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
