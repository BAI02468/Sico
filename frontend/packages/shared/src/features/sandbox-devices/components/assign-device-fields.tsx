import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { z } from "zod";

// Scheme A — bind a device to a Digital Worker instance only (no operator
// cascade). The single required field is the instance id (as a string, since a
// `Select` yields strings). A module const: zod v4's `error` callback resolves
// the message via `i18n._()` at validation time, so it always reflects the
// active locale without a factory or injected `t`.
const WORKER_REQUIRED = msg({
  id: "sandboxDevices.assignDialog.validation.workerRequired",
  message: "Pick a digital worker",
});

export const assignDeviceSchema = z.object({
  instanceId: z.string().min(1, { error: () => i18n._(WORKER_REQUIRED) }),
});
export type AssignDeviceValues = z.infer<typeof assignDeviceSchema>;

export const ASSIGN_DEVICE_INITIAL_VALUES: AssignDeviceValues = {
  instanceId: "",
};
