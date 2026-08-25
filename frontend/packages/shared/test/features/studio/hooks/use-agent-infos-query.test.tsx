import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { AxiosInstance } from "axios";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  agentInfosQueryOptions,
  useAgentInfosQuery,
} from "@/features/studio/hooks/use-agent-infos-query";
import { PLATFORM_AGENT_INFOS_INTENT } from "@/features/studio/services/single-agents";
import { makeOkEnvelope } from "@/schemas/api";
import { ApiClientProvider } from "@/services/api-client-context";
import { createApiClient } from "@/services/axios";
import { createTestApiClient } from "@/testing/create-test-api-client";

function makeWrapper(apiClient: AxiosInstance) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <QueryClientProvider client={client}>
        <ApiClientProvider client={apiClient}>{children}</ApiClientProvider>
      </QueryClientProvider>
    );
  };
}

describe("useAgentInfosQuery", () => {
  it("includes the intent in the query key", () => {
    const apiClient = createApiClient();

    expect(
      agentInfosQueryOptions(apiClient, PLATFORM_AGENT_INFOS_INTENT).queryKey,
    ).toEqual(["studio-agent-infos", 1]);
  });

  it("loads the studio agent cards", async () => {
    const get = vi.fn().mockResolvedValue({
      data: makeOkEnvelope({
        agentInfos: [{ agentId: "1", name: "Atlas" }],
      }),
    });
    const apiClient = createTestApiClient({ get });
    const { result } = renderHook(() => useAgentInfosQuery(), {
      wrapper: makeWrapper(apiClient),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ agentId: "1", name: "Atlas" }]);
  });
});
