import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { AxiosInstance } from "axios";
import type { JSX, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { projectKeys } from "../../../../src/features/projects/query-keys";
import { useAssignDeviceMutation } from "../../../../src/features/sandbox-devices/hooks/use-assign-device-mutation";
import { makeOkEnvelope } from "../../../../src/schemas/api";
import { ApiClientProvider } from "../../../../src/services/api-client-context";

function makeWrapper(
  client: AxiosInstance,
): (p: { children: ReactNode }) => JSX.Element {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    return (
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={client}>{children}</ApiClientProvider>
      </QueryClientProvider>
    );
  };
}

describe("useAssignDeviceMutation", () => {
  it("POSTs the assignment then resolves", async () => {
    const post = vi.fn().mockResolvedValue({ data: makeOkEnvelope({}) });
    const client = {
      post,
    } as Partial<AxiosInstance> as AxiosInstance;
    const { result } = renderHook(() => useAssignDeviceMutation(7), {
      wrapper: makeWrapper(client),
    });
    await result.current.mutateAsync({ instanceId: "42", sandboxId: "sb-1" });
    expect(post).toHaveBeenCalledWith("/sandbox/assign", {
      instance_id: "42",
      sandbox_id: "sb-1",
    });
  });

  it("invalidates both the devices list and the project detail on success", async () => {
    const post = vi.fn().mockResolvedValue({ data: makeOkEnvelope({}) });
    const client = { post } as Partial<AxiosInstance> as AxiosInstance;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, "invalidateQueries");

    function Wrapper({ children }: { children: ReactNode }): JSX.Element {
      return (
        <QueryClientProvider client={queryClient}>
          <ApiClientProvider client={client}>{children}</ApiClientProvider>
        </QueryClientProvider>
      );
    }

    const { result } = renderHook(() => useAssignDeviceMutation(7), {
      wrapper: Wrapper,
    });
    await result.current.mutateAsync({ instanceId: "42", sandboxId: "sb-1" });
    // The sandbox PAGE reads the devices query; the drawer reads the detail.
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({
        queryKey: ["sandbox-devices", "list", 7],
      }),
    );
    expect(spy).toHaveBeenCalledWith({ queryKey: projectKeys.detail(7) });
  });
});
