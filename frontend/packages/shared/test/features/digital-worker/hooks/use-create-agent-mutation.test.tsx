import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { AxiosInstance } from "axios";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AGENTS_QUERY_KEY_PREFIX } from "@/features/digital-worker/hooks/use-agents-query";
import { useCreateAgentInstanceMutation } from "@/features/digital-worker/hooks/use-create-agent-mutation";
import * as service from "@/features/digital-worker/services/agents";
import { projectKeys } from "@/features/projects/query-keys";
import { ApiClientProvider } from "@/services/api-client-context";

vi.mock("@/features/digital-worker/services/agents");

const createInput = {
  agentId: "tmpl-1",
  employerUsername: "a@b.com",
  name: "Nova",
  projectId: 7,
};
const created = { id: 9, agentId: "tmpl-1", employerUsername: "a@b.com" };

function makeWrapper(): {
  Wrapper: (props: { children: ReactNode }) => ReactElement;
  queryClient: QueryClient;
} {
  const apiClient = {} as AxiosInstance;
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false, staleTime: Infinity },
    },
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

beforeEach(() => {
  vi.mocked(service.createAgentInstance).mockReset();
});

describe("useCreateAgentInstanceMutation", () => {
  it("forwards the create input (incl. projectId) to the service", async () => {
    vi.mocked(service.createAgentInstance).mockResolvedValue(created);
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateAgentInstanceMutation(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync(createInput);

    expect(service.createAgentInstance).toHaveBeenCalledWith(
      expect.anything(),
      createInput,
    );
  });

  it("invalidates agent lists, project lists, and only the target project detail", async () => {
    vi.mocked(service.createAgentInstance).mockResolvedValue(created);
    const { Wrapper, queryClient } = makeWrapper();
    const agentListKey = [
      ...AGENTS_QUERY_KEY_PREFIX,
      { pageSize: 20 },
    ] as const;
    const projectListKey = projectKeys.list({ memberType: 1, pageSize: 20 });
    const targetDetailKey = projectKeys.detail(7);
    const otherDetailKey = projectKeys.detail(8);
    const assetsKey = projectKeys.projectAssets(7);
    queryClient.setQueryData(agentListKey, { pages: [] });
    queryClient.setQueryData(projectListKey, { pages: [] });
    queryClient.setQueryData(targetDetailKey, { id: 7 });
    queryClient.setQueryData(otherDetailKey, { id: 8 });
    queryClient.setQueryData(assetsKey, []);
    const { result } = renderHook(() => useCreateAgentInstanceMutation(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync(createInput);

    expect(queryClient.getQueryState(agentListKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(projectListKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(targetDetailKey)?.isInvalidated).toBe(
      true,
    );
    expect(queryClient.getQueryState(otherDetailKey)?.isInvalidated).toBe(
      false,
    );
    expect(queryClient.getQueryState(assetsKey)?.isInvalidated).toBe(false);
  });

  it("stays pending until the target project detail refetch settles", async () => {
    vi.mocked(service.createAgentInstance).mockResolvedValue(created);
    const { Wrapper, queryClient } = makeWrapper();
    const targetDetailKey = projectKeys.detail(7);
    queryClient.setQueryData(targetDetailKey, { id: 7 });
    let resolveDetail: (value: { id: number }) => void = () => {
      throw new Error("detail refetch did not start");
    };
    const detailFetcher = vi.fn(
      () =>
        new Promise<{ id: number }>((resolve) => {
          resolveDetail = resolve;
        }),
    );
    const { result } = renderHook(
      () => ({
        mutation: useCreateAgentInstanceMutation(),
        detail: useQuery({
          queryKey: targetDetailKey,
          queryFn: detailFetcher,
        }),
      }),
      { wrapper: Wrapper },
    );

    act(() => result.current.mutation.mutate(createInput));

    await waitFor(() => expect(detailFetcher).toHaveBeenCalledOnce());
    expect(result.current.mutation.isPending).toBe(true);

    await act(async () => resolveDetail({ id: 7 }));

    await waitFor(() => expect(result.current.mutation.isPending).toBe(false));
  });
});
