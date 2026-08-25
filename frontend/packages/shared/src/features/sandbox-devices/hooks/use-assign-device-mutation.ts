import {
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";

import { useApiClient } from "../../../services/api-client-context";
import {
  assignDevice,
  type AssignDeviceInput,
  deviceKeys,
} from "../../devices";
import { projectKeys } from "../../projects/query-keys";

// Bind a device to a Digital Worker instance, then invalidate the project's
// device list (the sandbox PAGE) AND the project detail (the DRAWER reads its
// sandbox count from `project.sandboxes`) so both refresh immediately.
export function useAssignDeviceMutation(
  projectId: number,
): UseMutationResult<void, Error, AssignDeviceInput> {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignDeviceInput) => assignDevice(apiClient, input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: deviceKeys.project(projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: projectKeys.detail(projectId),
        }),
      ]),
  });
}
