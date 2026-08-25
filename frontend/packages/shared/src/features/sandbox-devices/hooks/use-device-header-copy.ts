import { useLingui } from "@lingui/react/macro";

export const DEVICE_HEADER_KEYS = ["device", "type", "assignedWorker"] as const;

export type DeviceHeaderCopy = Record<
  (typeof DEVICE_HEADER_KEYS)[number] | "status" | "actions",
  string
>;

// The device-table column headers, resolved via the subscribed hook `t`.
// Shared by DevicesTable and its loading skeleton so a reworded header can't
// drift between the two.
export function useDeviceHeaderCopy(): DeviceHeaderCopy {
  const { t } = useLingui();
  return {
    device: t({ id: "sandboxDevices.table.device", message: "DEVICE" }),
    type: t({ id: "sandboxDevices.table.type", message: "TYPE" }),
    assignedWorker: t({
      id: "sandboxDevices.table.assignedWorker",
      message: "ASSIGNED WORKER",
    }),
    status: t({ id: "sandboxDevices.table.status", message: "STATUS" }),
    actions: t({ id: "sandboxDevices.table.actions", message: "ACTIONS" }),
  };
}
