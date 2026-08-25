import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import axios, { type AxiosInstance } from "axios";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deviceKeys,
  organizationDevicesQueryOptions,
  projectDevicesQueryOptions,
  useOrganizationDevicesQuery,
  useProjectDevicesQuery,
} from "@/features/devices";
import * as devicesService from "@/features/devices/services/devices";
import { ApiClientProvider } from "@/services/api-client-context";

vi.mock("@/features/devices/services/devices");

function wrapper(
  client: AxiosInstance,
): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={client}>{children}</ApiClientProvider>
      </QueryClientProvider>
    );
  };
}

beforeEach(() => {
  vi.mocked(devicesService.fetchDevices).mockReset().mockResolvedValue([]);
});

describe("project device queries", () => {
  it("uses the project key and service scope", async () => {
    const client = axios.create();
    const options = projectDevicesQueryOptions(7, client);

    expect(options.queryKey).toEqual(deviceKeys.project(7));
    await new QueryClient().fetchQuery(options);
    expect(devicesService.fetchDevices).toHaveBeenCalledWith(client, {
      projectId: 7,
    });
  });

  it("preserves Query Client defaults", () => {
    const options = projectDevicesQueryOptions(7, axios.create());

    expect(options).not.toHaveProperty("staleTime");
    expect(options).not.toHaveProperty("gcTime");
    expect(options).not.toHaveProperty("refetchOnWindowFocus");
  });

  it("exposes the ordinary project query hook", async () => {
    const client = axios.create();
    const { result } = renderHook(() => useProjectDevicesQuery(7), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(devicesService.fetchDevices).toHaveBeenCalledWith(client, {
      projectId: 7,
    });
  });
});

describe("organization device queries", () => {
  it("uses the organization key, service scope, and stale time", async () => {
    const client = axios.create();
    const options = organizationDevicesQueryOptions(9, client);

    expect(options.queryKey).toEqual(deviceKeys.organization(9));
    expect(options.staleTime).toBe(30_000);
    await new QueryClient().fetchQuery(options);
    expect(devicesService.fetchDevices).toHaveBeenCalledWith(client, {
      organizationId: 9,
    });
  });

  it("exposes the suspense organization query hook", async () => {
    const client = axios.create();
    const { result } = renderHook(() => useOrganizationDevicesQuery(9), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current.data).toEqual([]));
    expect(devicesService.fetchDevices).toHaveBeenCalledWith(client, {
      organizationId: 9,
    });
  });
});
