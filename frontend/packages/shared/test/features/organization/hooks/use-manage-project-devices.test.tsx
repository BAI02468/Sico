import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { AxiosInstance } from "axios";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deviceKeys } from "@/features/devices/query-keys";
import * as allocationService from "@/features/devices/services/project-device-allocation";
import { useManageProjectDevices } from "@/features/organization/hooks/use-manage-project-devices";
import { organizationKeys } from "@/features/organization/query-keys";
import { projectKeys } from "@/features/projects/query-keys";
import { ApiClientProvider } from "@/services/api-client-context";

vi.mock("@/features/devices/services/project-device-allocation");

function makeWrapper(): {
  Wrapper: (props: { children: ReactNode }) => ReactElement;
  apiClient: AxiosInstance;
  queryClient: QueryClient;
} {
  const apiClient = {} as AxiosInstance;
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={apiClient}>{children}</ApiClientProvider>
      </QueryClientProvider>
    );
  }

  return { Wrapper, apiClient, queryClient };
}

beforeEach(() => {
  vi.mocked(allocationService.updateProjectDeviceAllocation)
    .mockReset()
    .mockResolvedValue(undefined);
});

describe("useManageProjectDevices", () => {
  it("delegates the allocation sequence to the Devices service", async () => {
    const { Wrapper, apiClient } = makeWrapper();
    const { result } = renderHook(() => useManageProjectDevices(9, 7), {
      wrapper: Wrapper,
    });
    const input = { assignIds: ["add-1"], unassignIds: ["remove-1"] };

    await result.current.mutateAsync(input);

    expect(
      allocationService.updateProjectDeviceAllocation,
    ).toHaveBeenCalledWith(apiClient, 7, input);
  });

  it("reports mutation success without waiting for refetches", async () => {
    const { Wrapper, queryClient } = makeWrapper();
    vi.spyOn(queryClient, "invalidateQueries").mockReturnValue(
      new Promise(() => {}),
    );
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useManageProjectDevices(9, 7), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.mutate(
        { assignIds: ["add-1"], unassignIds: ["remove-1"] },
        { onSuccess },
      );
    });

    await waitFor(() =>
      expect(
        allocationService.updateProjectDeviceAllocation,
      ).toHaveBeenCalledOnce(),
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
  });

  it("invalidates organization and project device data after failure", async () => {
    vi.mocked(
      allocationService.updateProjectDeviceAllocation,
    ).mockRejectedValue(new Error("partial failure"));
    const { Wrapper, queryClient } = makeWrapper();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useManageProjectDevices(9, 7), {
      wrapper: Wrapper,
    });

    await expect(
      result.current.mutateAsync({ assignIds: [], unassignIds: ["remove-1"] }),
    ).rejects.toThrow("partial failure");

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: organizationKeys.projects(9),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: deviceKeys.organization(9),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: projectKeys.detail(7),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: deviceKeys.project(7),
    });
  });
});
