import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  useCreateSingleAgentMutation,
  useDeleteSingleAgentMutation,
  usePublishSingleAgentMutation,
  useUpdateSingleAgentMutation,
} from "@/features/studio/hooks/use-single-agent-mutations";
import * as publishService from "@/features/studio/services/publish-single-agent";
import * as service from "@/features/studio/services/single-agent-mutations";
import { ApiClientProvider } from "@/services/api-client-context";
import { createTestApiClient } from "@/testing/create-test-api-client";

vi.mock("@/features/studio/services/publish-single-agent");
vi.mock("@/features/studio/services/single-agent-mutations");

function makeWrapper(): {
  Wrapper: (props: { children: ReactNode }) => ReactElement;
  queryClient: QueryClient;
} {
  const apiClient = createTestApiClient();
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

  return { Wrapper, queryClient };
}

describe("Studio list invalidation", () => {
  it("invalidates the created agent's organization Studio list", async () => {
    vi.mocked(service.createSingleAgent).mockResolvedValue({
      agentId: "00000000-0000-4000-8000-000000000001",
    });
    const { Wrapper, queryClient } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCreateSingleAgentMutation(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      name: "Researcher",
      role: "Researcher",
      organizationId: 7,
    });

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["studio-agents", "organization", 7],
      }),
    );
  });

  it("invalidates the platform Studio list after creating an agent", async () => {
    vi.mocked(service.createSingleAgent).mockResolvedValue({
      agentId: "00000000-0000-4000-8000-000000000001",
    });
    const { Wrapper, queryClient } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCreateSingleAgentMutation(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      name: "Researcher",
      role: "Researcher",
      organizationId: 7,
    });

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["studio-agents", "platform"],
      }),
    );
  });

  it("does not leave an incomplete created-agent detail cache fresh", async () => {
    vi.mocked(service.createSingleAgent).mockResolvedValue({
      agentId: "00000000-0000-4000-8000-000000000001",
    });
    const { Wrapper, queryClient } = makeWrapper();
    const { result } = renderHook(() => useCreateSingleAgentMutation(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      name: "Researcher",
      role: "Researcher",
      organizationId: 7,
    });

    expect(
      queryClient.getQueryData([
        "studio-single-agent",
        "00000000-0000-4000-8000-000000000001",
      ]),
    ).toBeUndefined();
  });

  it("invalidates the agent detail and Studio lists after publish", async () => {
    vi.mocked(publishService.publishSingleAgent).mockResolvedValue();
    const { Wrapper, queryClient } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => usePublishSingleAgentMutation(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      agentId: "00000000-0000-4000-8000-000000000001",
      access: "only_me",
    });

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: [
          "studio-single-agent",
          "00000000-0000-4000-8000-000000000001",
        ],
      }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["studio-agents"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["studio-agent-infos"],
    });
  });

  it("removes the deleted agent detail and invalidates Studio lists", async () => {
    vi.mocked(service.deleteSingleAgent).mockResolvedValue();
    const { Wrapper, queryClient } = makeWrapper();
    const removeSpy = vi.spyOn(queryClient, "removeQueries");
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useDeleteSingleAgentMutation(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync("00000000-0000-4000-8000-000000000001");

    await waitFor(() =>
      expect(removeSpy).toHaveBeenCalledWith({
        queryKey: [
          "studio-single-agent",
          "00000000-0000-4000-8000-000000000001",
        ],
      }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["studio-agents"],
    });
  });

  it("invalidates every Studio list after an agent update", async () => {
    vi.mocked(service.updateSingleAgent).mockResolvedValue();
    const { Wrapper, queryClient } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useUpdateSingleAgentMutation(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      agentId: "00000000-0000-4000-8000-000000000001",
      name: "Researcher",
      role: "Researcher",
    });

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["studio-agents"],
      }),
    );
  });
});
