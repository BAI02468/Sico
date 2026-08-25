import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { AxiosInstance } from "axios";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useDeleteProjectMutation } from "@/features/projects/hooks/use-delete-project-mutation";
import { projectKeys } from "@/features/projects/query-keys";
import * as service from "@/features/projects/services/projects";
import { ApiClientProvider } from "@/services/api-client-context";

vi.mock("@/features/projects/services/projects");

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
  vi.mocked(service.deleteProject).mockReset().mockResolvedValue(undefined);
});

describe("useDeleteProjectMutation", () => {
  it("calls the delete service with the project id", async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteProjectMutation(7), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync();

    expect(service.deleteProject).toHaveBeenCalledWith(expect.anything(), 7);
  });

  it("refetches lists and marks only the deleted detail stale", async () => {
    const { Wrapper, queryClient } = makeWrapper();
    const activeListKey = projectKeys.list({ memberType: 1, pageSize: 20 });
    const inactiveListKey = projectKeys.list({ memberType: 1, pageSize: 40 });
    const deletedDetailKey = projectKeys.detail(7);
    const otherDetailKey = projectKeys.detail(8);
    const unrelatedKey = ["teams", "list"] as const;
    queryClient.setQueryData(activeListKey, ["cached"]);
    queryClient.setQueryData(inactiveListKey, ["cached"]);
    queryClient.setQueryData(deletedDetailKey, { id: 7 });
    queryClient.setQueryData(otherDetailKey, { id: 8 });
    queryClient.setQueryData(unrelatedKey, ["cached"]);
    const listFetcher = vi.fn().mockResolvedValue(["fresh"]);
    const detailFetcher = vi.fn().mockResolvedValue({ id: 7 });
    const { result } = renderHook(
      () => ({
        mutation: useDeleteProjectMutation(7),
        list: useQuery({ queryKey: activeListKey, queryFn: listFetcher }),
        detail: useQuery({
          queryKey: deletedDetailKey,
          queryFn: detailFetcher,
        }),
      }),
      { wrapper: Wrapper },
    );

    await result.current.mutation.mutateAsync();

    expect(listFetcher).toHaveBeenCalledOnce();
    expect(detailFetcher).not.toHaveBeenCalled();
    expect(queryClient.getQueryState(inactiveListKey)?.isInvalidated).toBe(
      true,
    );
    expect(queryClient.getQueryState(deletedDetailKey)).toMatchObject({
      fetchStatus: "idle",
      isInvalidated: true,
    });
    expect(queryClient.getQueryData(deletedDetailKey)).toEqual({ id: 7 });
    expect(queryClient.getQueryState(otherDetailKey)?.isInvalidated).toBe(
      false,
    );
    expect(queryClient.getQueryState(unrelatedKey)?.isInvalidated).toBe(false);
  });
});
