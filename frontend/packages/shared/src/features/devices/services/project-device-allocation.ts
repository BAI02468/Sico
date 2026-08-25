import type { AxiosInstance } from "axios";

import { assignProjectDevices, unassignProjectDevices } from "./devices";

export type ProjectDeviceAllocationInput = {
  assignIds: string[];
  unassignIds: string[];
};

export async function updateProjectDeviceAllocation(
  client: AxiosInstance,
  projectId: number,
  { assignIds, unassignIds }: ProjectDeviceAllocationInput,
): Promise<void> {
  await assignProjectDevices(client, projectId, assignIds);
  try {
    await unassignProjectDevices(client, projectId, unassignIds);
  } catch (error) {
    try {
      await unassignProjectDevices(client, projectId, assignIds);
    } catch (rollbackError) {
      const message =
        error instanceof Error ? error.message : "Device allocation failed";
      throw new AggregateError([error, rollbackError], message);
    }
    throw error;
  }
}
