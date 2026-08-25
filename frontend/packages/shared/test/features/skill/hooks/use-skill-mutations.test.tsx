import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { AxiosInstance } from "axios";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { SKILL_DETAIL_QUERY_KEY_PREFIX } from "@/features/skill/hooks/use-skill-detail-query";
import {
  useCreateSkillMutation,
  useDeleteSkillMutation,
  useUpdateSkillMutation,
} from "@/features/skill/hooks/use-skill-mutations";
import { SKILL_STATUS_QUERY_KEY_PREFIX } from "@/features/skill/hooks/use-skill-status-query";
import { SKILLS_QUERY_KEY_PREFIX } from "@/features/skill/hooks/use-skills-query";
import { makeOkEnvelope } from "@/schemas/api";
import { ApiClientProvider } from "@/services/api-client-context";
import { createTestApiClient } from "@/testing/create-test-api-client";

function makeWrapper(apiClient: AxiosInstance): {
  Wrapper: ({ children }: { children: ReactNode }) => ReactElement;
  client: QueryClient;
} {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <QueryClientProvider client={client}>
        <ApiClientProvider client={apiClient}>{children}</ApiClientProvider>
      </QueryClientProvider>
    );
  }

  return { Wrapper, client };
}

describe("useCreateSkillMutation", () => {
  it("resets the Skill list after an indeterminate create failure", async () => {
    const post = vi.fn().mockRejectedValue(new Error("response lost"));
    const apiClient = createTestApiClient({ post });
    const { Wrapper, client } = makeWrapper(apiClient);
    const reset = vi.spyOn(client, "resetQueries");
    const { result } = renderHook(() => useCreateSkillMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ agentId: "agent-1", assetId: 41 }),
      ).rejects.toThrow("response lost");
    });

    expect(reset).toHaveBeenCalledWith({
      queryKey: [SKILLS_QUERY_KEY_PREFIX],
    });
  });
});

describe("useDeleteSkillMutation", () => {
  it("calls deleteSkill and resolves", async () => {
    const del = vi.fn().mockResolvedValue({ data: { code: 0, msg: "ok" } });
    const apiClient = createTestApiClient({ delete: del });
    const { result } = renderHook(() => useDeleteSkillMutation(), {
      wrapper: makeWrapper(apiClient).Wrapper,
    });
    await act(async () => {
      await result.current.mutateAsync(9);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(del).toHaveBeenCalledWith("/skills", { params: { id: 9 } });
  });
});

describe("useUpdateSkillMutation", () => {
  it("invalidates the list, detail, and status caches after a Skill update", async () => {
    const put = vi.fn().mockResolvedValue({
      data: makeOkEnvelope({
        skillId: 9,
        version: "v2",
        name: "Search",
        description: "",
      }),
    });
    const apiClient = createTestApiClient({ put });
    const { Wrapper, client } = makeWrapper(apiClient);
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpdateSkillMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        id: 9,
        currentVersion: "v1",
        files: [{ path: "SKILL.md", content: "# Updated" }],
      });
    });

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: [SKILLS_QUERY_KEY_PREFIX],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: [SKILL_DETAIL_QUERY_KEY_PREFIX, 9],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: [SKILL_STATUS_QUERY_KEY_PREFIX, 9],
    });
  });
});
