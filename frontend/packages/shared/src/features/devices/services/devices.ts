import type { AxiosInstance } from "axios";
import { z } from "zod";

import { SANDBOX_ENDPOINTS } from "../../../constants/endpoints";
import { apiResponseSchema, assertOk, unwrapData } from "../../../schemas/api";
import {
  type Device,
  deviceListDataSchema,
  flattenDeviceGroups,
} from "../schemas/device";

const listEnvelope = apiResponseSchema(deviceListDataSchema);

export type DeviceListScope =
  | { projectId: number }
  | { organizationId: number };

export async function fetchDevices(
  client: AxiosInstance,
  scope: DeviceListScope,
): Promise<Device[]> {
  const response = await client.get<unknown>(SANDBOX_ENDPOINTS.list, {
    params: scope,
  });
  const data = unwrapData(listEnvelope.parse(response.data), "fetchDevices");
  const devices = flattenDeviceGroups(data);
  if (
    "organizationId" in scope &&
    devices.some((device) => device.organizationId !== scope.organizationId)
  ) {
    throw new Error("Sandbox outside organization scope");
  }
  if (
    "projectId" in scope &&
    devices.some((device) => device.projectId !== scope.projectId)
  ) {
    throw new Error("Sandbox outside requested project scope");
  }
  return devices;
}

async function updateProjectDevices(
  client: AxiosInstance,
  path:
    | typeof SANDBOX_ENDPOINTS.projectAssign
    | typeof SANDBOX_ENDPOINTS.projectUnassign,
  projectId: number,
  sandboxIds: string[],
): Promise<void> {
  const uniqueIds = Array.from(new Set(sandboxIds));
  if (uniqueIds.length === 0) {
    return;
  }
  const response = await client.post<unknown>(path, {
    project_id: projectId,
    sandbox_ids: uniqueIds,
  });
  assertOk(
    apiResponseSchema(z.unknown()).parse(response.data),
    "updateProjectDevices",
  );
}

export function assignProjectDevices(
  client: AxiosInstance,
  projectId: number,
  sandboxIds: string[],
): Promise<void> {
  return updateProjectDevices(
    client,
    SANDBOX_ENDPOINTS.projectAssign,
    projectId,
    sandboxIds,
  );
}

export function unassignProjectDevices(
  client: AxiosInstance,
  projectId: number,
  sandboxIds: string[],
): Promise<void> {
  return updateProjectDevices(
    client,
    SANDBOX_ENDPOINTS.projectUnassign,
    projectId,
    sandboxIds,
  );
}

export type AssignDeviceInput = {
  instanceId: string;
  sandboxId: string;
};

export async function assignDevice(
  client: AxiosInstance,
  { instanceId, sandboxId }: AssignDeviceInput,
): Promise<void> {
  const response = await client.post<unknown>(SANDBOX_ENDPOINTS.assign, {
    instance_id: instanceId,
    sandbox_id: sandboxId,
  });
  assertOk(apiResponseSchema(z.unknown()).parse(response.data), "assignDevice");
}
