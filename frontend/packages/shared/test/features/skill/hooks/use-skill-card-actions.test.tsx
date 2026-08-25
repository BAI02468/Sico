import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { AxiosInstance } from "axios";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSkillCardActions } from "@/features/skill/hooks/use-skill-card-actions";
import type { SkillItem, SkillVersion } from "@/features/skill/schemas/skill";
import { makeOkEnvelope } from "@/schemas/api";
import { ApiClientProvider } from "@/services/api-client-context";
import { createTestApiClient } from "@/testing/create-test-api-client";

const { toast } = vi.hoisted(() => ({
  toast: {
    dismiss: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@sico/ui", () => ({ toast }));

const skill: SkillItem = {
  id: 9,
  agentId: "agent-1",
  name: "Search",
  description: "",
  version: "v1",
  status: 2,
  assetId: 41,
  creatorUsername: "",
  failReason: "",
  projectId: 1,
  createdAt: 1,
  updatedAt: "2",
};
const version: SkillVersion = {
  id: 10,
  skillId: 9,
  version: "v1",
  name: "Search",
  description: "",
  assetId: 41,
  url: "https://example.test/search.md",
  creatorUsername: "",
  failReason: "",
  createdAt: 1,
  updatedAt: 2,
  files: [{ path: "skill.md", content: "# Search" }],
  actions: [],
};

function makeWrapper(apiClient: AxiosInstance) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={apiClient}>{children}</ApiClientProvider>
      </QueryClientProvider>
    );
  };
}

describe("useSkillCardActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("suppresses Skill save feedback when the registry coordinates the save", async () => {
    const put = vi.fn().mockResolvedValue({
      data: makeOkEnvelope({
        skillId: 9,
        version: "v2",
        name: "Search",
        description: "",
      }),
    });
    const apiClient = createTestApiClient({ put });
    const { result } = renderHook(
      () => useSkillCardActions(skill, "v1", version, vi.fn()),
      { wrapper: makeWrapper(apiClient) },
    );

    await act(async () => {
      await result.current.save(
        { files: [{ path: "skill.md", content: "# Updated" }] },
        { showToast: false },
      );
    });

    expect(put).toHaveBeenCalledOnce();
    expect(toast.loading).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("owns replacement feedback when asset upload fails", async () => {
    const post = vi.fn().mockRejectedValue(new Error("upload failed"));
    const put = vi.fn();
    const onReplaced = vi.fn();
    const { result } = renderHook(
      () => useSkillCardActions(skill, "v1", version, onReplaced),
      { wrapper: makeWrapper(createTestApiClient({ post, put })) },
    );

    await act(async () => {
      await expect(
        result.current.replaceConfirm([
          new File(["# Search"], "search.md", { type: "text/markdown" }),
        ]),
      ).rejects.toThrow("upload failed");
    });

    expect(toast.error).toHaveBeenCalledOnce();
    expect(toast.error).toHaveBeenCalledWith("Failed to replace skill");
    expect(put).not.toHaveBeenCalled();
    expect(onReplaced).not.toHaveBeenCalled();
  });

  it("owns replacement feedback when skill update fails", async () => {
    const post = vi
      .fn()
      .mockResolvedValue({ data: makeOkEnvelope({ id: 42 }) });
    const put = vi.fn().mockRejectedValue(new Error("update failed"));
    const onReplaced = vi.fn();
    const { result } = renderHook(
      () => useSkillCardActions(skill, "v1", version, onReplaced),
      { wrapper: makeWrapper(createTestApiClient({ post, put })) },
    );

    await act(async () => {
      await expect(
        result.current.replaceConfirm([
          new File(["# Search"], "search.md", { type: "text/markdown" }),
        ]),
      ).rejects.toThrow("update failed");
    });

    expect(toast.error).toHaveBeenCalledOnce();
    expect(toast.error).toHaveBeenCalledWith("Failed to replace skill");
    expect(onReplaced).not.toHaveBeenCalled();
  });
});
