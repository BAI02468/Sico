import { type Device } from "../schemas/device";

export type DeviceCategory = "mobile" | "windows";
export type DeviceCounts = Record<DeviceCategory, number>;
export type DeviceSummary = Record<
  DeviceCategory,
  { total: number; available: number }
>;

export function categoryForDevice(type: string): DeviceCategory | null {
  if (type === "emulator") {
    return "mobile";
  }
  if (type === "wincua" || type === "physical") {
    return "windows";
  }
  return null;
}

export function buildDeviceSummary(devices: Device[]): DeviceSummary {
  const summary: DeviceSummary = {
    mobile: { total: 0, available: 0 },
    windows: { total: 0, available: 0 },
  };
  for (const device of devices) {
    const category = categoryForDevice(device.type);
    if (!category) {
      continue;
    }
    summary[category].total += 1;
    if (device.projectId === 0 && device.allocatable) {
      summary[category].available += 1;
    }
  }
  return summary;
}

export function projectDeviceCounts(
  devices: Device[],
  projectId: number,
): DeviceCounts {
  const counts: DeviceCounts = { mobile: 0, windows: 0 };
  for (const device of devices) {
    const category = categoryForDevice(device.type);
    if (category && device.projectId === projectId) {
      counts[category] += 1;
    }
  }
  return counts;
}

export function getAllocationBounds(
  devices: Device[],
  projectId: number,
  category: DeviceCategory,
): { current: number; minimum: number; maximum: number; available: number } {
  const matching = devices.filter(
    (device) => categoryForDevice(device.type) === category,
  );
  const current = matching.filter((device) => device.projectId === projectId);
  const available = matching.filter(
    (device) => device.projectId === 0 && device.allocatable,
  ).length;
  return {
    current: current.length,
    minimum: 0,
    maximum: current.length + available,
    available,
  };
}

function planCategory(
  devices: Device[],
  projectId: number,
  category: DeviceCategory,
  target: number,
): { assignIds: string[]; unassignIds: string[] } {
  const bounds = getAllocationBounds(devices, projectId, category);
  if (target < bounds.minimum || target > bounds.maximum) {
    throw new RangeError();
  }
  const matching = devices
    .filter((device) => categoryForDevice(device.type) === category)
    .sort((left, right) => left.sandboxId.localeCompare(right.sandboxId));
  if (target > bounds.current) {
    const assignIds = matching
      .filter((device) => device.projectId === 0 && device.allocatable)
      .slice(0, target - bounds.current)
      .map((device) => device.sandboxId);
    return { assignIds, unassignIds: [] };
  }
  const unassignIds = matching
    .filter((device) => device.projectId === projectId)
    .sort(
      (left, right) =>
        Number(left.instanceId !== "") - Number(right.instanceId !== "") ||
        left.sandboxId.localeCompare(right.sandboxId),
    )
    .slice(0, bounds.current - target)
    .map((device) => device.sandboxId);
  return { assignIds: [], unassignIds };
}

export function planDeviceAllocation(
  devices: Device[],
  projectId: number,
  targets: DeviceCounts,
): { assignIds: string[]; unassignIds: string[] } {
  const mobile = planCategory(devices, projectId, "mobile", targets.mobile);
  const windows = planCategory(devices, projectId, "windows", targets.windows);
  return {
    assignIds: [...mobile.assignIds, ...windows.assignIds],
    unassignIds: [...mobile.unassignIds, ...windows.unassignIds],
  };
}
