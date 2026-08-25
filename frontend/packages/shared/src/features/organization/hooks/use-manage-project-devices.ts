import {
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";

import { useApiClient } from "../../../services/api-client-context";
import {
  deviceKeys,
  type ProjectDeviceAllocationInput,
  updateProjectDeviceAllocation,
} from "../../devices";
import { projectKeys } from "../../projects/query-keys";
import { organizationKeys } from "../query-keys";

export type ManageProjectDevicesInput = ProjectDeviceAllocationInput;

export function useManageProjectDevices(
  organizationId: number,
  projectId: number,
): UseMutationResult<void, Error, ManageProjectDevicesInput> {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) =>
      updateProjectDeviceAllocation(apiClient, projectId, input),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: organizationKeys.projects(organizationId),
      });
      void queryClient.invalidateQueries({
        queryKey: deviceKeys.organization(organizationId),
      });
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: deviceKeys.project(projectId),
      });
    },
  });
}
