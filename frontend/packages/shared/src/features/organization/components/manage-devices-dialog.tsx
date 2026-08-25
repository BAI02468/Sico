import { useLingui } from "@lingui/react/macro";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from "@sico/ui";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import type * as React from "react";

import { DeviceStepper } from "./device-stepper";
import {
  type Device,
  type DeviceCategory,
  type DeviceCounts,
  getAllocationBounds,
  planDeviceAllocation,
  projectDeviceCounts,
} from "../../devices";
import { type OrganizationProject } from "../../projects/schemas/project";
import { useManageProjectDevices } from "../hooks/use-manage-project-devices";

export function ManageDevicesDialog({
  organizationId,
  project,
  devices,
  canManage,
  open,
  onOpenChange,
}: {
  organizationId: number;
  project: OrganizationProject;
  devices: Device[];
  canManage: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const { t } = useLingui();
  const initial = projectDeviceCounts(devices, project.id);
  const [targets, setTargets] = useState<DeviceCounts>(initial);
  const mutation = useManageProjectDevices(organizationId, project.id);
  const mobile = getAllocationBounds(devices, project.id, "mobile");
  const windows = getAllocationBounds(devices, project.id, "windows");
  const changed =
    targets.mobile !== mobile.current || targets.windows !== windows.current;
  const savedCopy = t({
    id: "organization.devices.saved",
    message: "Device allocation updated.",
  });
  const setCategory = (category: DeviceCategory, value: number): void => {
    setTargets((previous) => ({ ...previous, [category]: value }));
  };
  const onSave = (): void => {
    const plan = planDeviceAllocation(devices, project.id, targets);
    mutation.mutate(plan, {
      onSuccess: () => {
        toast.success(savedCopy, { invert: true });
        onOpenChange(false);
      },
      onError: () =>
        toast.error(
          t({
            id: "organization.devices.partialFailure",
            message:
              "Some devices may have changed. The list has been refreshed.",
          }),
        ),
    });
  };
  const disabled = !canManage || mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="content" className="w-130">
        <DialogHeader>
          <DialogTitle>
            {t({
              id: "organization.devices.manage",
              message: "Manage Devices",
            })}
          </DialogTitle>
        </DialogHeader>
        <DeviceStepper
          category="mobile"
          value={targets.mobile}
          minimum={mobile.minimum}
          maximum={mobile.maximum}
          available={mobile.available - (targets.mobile - mobile.current)}
          disabled={disabled}
          onChange={(value) => setCategory("mobile", value)}
        />
        <DeviceStepper
          category="windows"
          value={targets.windows}
          minimum={windows.minimum}
          maximum={windows.maximum}
          available={windows.available - (targets.windows - windows.current)}
          disabled={disabled}
          onChange={(value) => setCategory("windows", value)}
        />
        <DialogFooter>
          <Button
            type="button"
            variant="subtle"
            onClick={() => onOpenChange(false)}
          >
            {t({ id: "common.action.cancel", message: "Cancel" })}
          </Button>
          <Button
            type="button"
            variant="primary"
            aria-busy={mutation.isPending}
            disabled={disabled || !changed}
            onClick={onSave}
          >
            {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
            {t({ id: "common.action.save", message: "Save" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
