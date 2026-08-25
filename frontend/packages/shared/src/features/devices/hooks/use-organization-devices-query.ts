import {
  useSuspenseQuery,
  type UseSuspenseQueryOptions,
  type UseSuspenseQueryResult,
} from "@tanstack/react-query";
import type { AxiosInstance } from "axios";

import { useApiClient } from "../../../services/api-client-context";
import { deviceKeys } from "../query-keys";
import { type Device } from "../schemas/device";
import { fetchDevices } from "../services/devices";

export function organizationDevicesQueryOptions(
  organizationId: number,
  apiClient: AxiosInstance,
): UseSuspenseQueryOptions<Device[]> {
  return {
    queryKey: deviceKeys.organization(organizationId),
    queryFn: () => fetchDevices(apiClient, { organizationId }),
    staleTime: 30_000,
  };
}

export function useOrganizationDevicesQuery(
  organizationId: number,
): UseSuspenseQueryResult<Device[]> {
  const apiClient = useApiClient();
  return useSuspenseQuery(
    organizationDevicesQueryOptions(organizationId, apiClient),
  );
}
