import {
  useQuery,
  type UseQueryResult,
  useSuspenseQuery,
  type UseSuspenseQueryResult,
} from "@tanstack/react-query";
import type { AxiosInstance } from "axios";

import { useApiClient } from "../../../services/api-client-context";
import { deviceKeys } from "../query-keys";
import { type Device } from "../schemas/device";
import { fetchDevices } from "../services/devices";

export function projectDevicesQueryOptions(
  projectId: number,
  apiClient: AxiosInstance,
): {
  queryKey: ReturnType<typeof deviceKeys.project>;
  queryFn: () => Promise<Device[]>;
} {
  return {
    queryKey: deviceKeys.project(projectId),
    queryFn: (): Promise<Device[]> => fetchDevices(apiClient, { projectId }),
  };
}

export function useProjectDevicesQuery(
  projectId: number,
): UseQueryResult<Device[]> {
  const apiClient = useApiClient();
  return useQuery(projectDevicesQueryOptions(projectId, apiClient));
}

export function useProjectDevicesSuspenseQuery(
  projectId: number,
): UseSuspenseQueryResult<Device[]> {
  const apiClient = useApiClient();
  return useSuspenseQuery(projectDevicesQueryOptions(projectId, apiClient));
}
