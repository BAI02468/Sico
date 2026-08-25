import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { AxiosInstance } from "axios";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  SkillSaveRegistryProvider,
  useSkillSaveRegistry,
} from "@/features/skill/components/setup/skill-save-registry";
import {
  type SaveDraftBatchResult,
  useStagedSkillDrafts,
} from "@/features/skill/hooks/use-staged-skill-drafts";
import { SkillStatusSchema } from "@/features/skill/schemas/skill";
import { makeOkEnvelope } from "@/schemas/api";
import { ApiClientProvider } from "@/services/api-client-context";
import { createTestApiClient } from "@/testing/create-test-api-client";

function skillResponse(
  id: number,
  assetId: number,
  name: string,
  version = "v1",
): { data: unknown } {
  return {
    data: makeOkEnvelope({
      skill: {
        id,
        agentId: "agent-1",
        name,
        description: "",
        version,
        status: SkillStatusSchema.enum.UPLOADING,
        assetId,
        creatorUsername: "",
        failReason: "",
        projectId: 1,
        createdAt: 1,
        updatedAt: "2",
      },
    }),
  };
}

function makeWrapper(apiClient: AxiosInstance) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={apiClient}>
          <SkillSaveRegistryProvider>{children}</SkillSaveRegistryProvider>
        </ApiClientProvider>
      </QueryClientProvider>
    );
  };
}

describe("useStagedSkillDrafts", () => {
  it("retries when asset upload fails before skill creation", async () => {
    const post = vi
      .fn()
      .mockRejectedValueOnce(new Error("upload failed"))
      .mockResolvedValueOnce({ data: makeOkEnvelope({ id: 41 }) })
      .mockResolvedValueOnce(skillResponse(9, 41, "Search"));
    const { result } = renderHook(
      () => ({
        drafts: useStagedSkillDrafts([], "agent-1"),
        registry: useSkillSaveRegistry(),
      }),
      { wrapper: makeWrapper(createTestApiClient({ post })) },
    );

    act(() => {
      result.current.drafts.stageFiles([
        new File(["# Search"], "search.md", { type: "text/markdown" }),
      ]);
    });
    const target = result.current.registry.dirtyTargets[0];
    if (!target) {
      throw new Error("Expected staged skill target");
    }
    await act(async () => {
      await expect(target.save("agent-1")).rejects.toThrow("upload failed");
    });

    expect(result.current.registry.hasRetryableFailure).toBe(true);
    await act(async () => {
      expect(await result.current.registry.retryAll()).toBe(true);
    });

    expect(result.current.drafts.drafts).toEqual([]);
    expect(post).toHaveBeenCalledTimes(3);
    expect(post).toHaveBeenNthCalledWith(3, "/skills", {
      agentId: "agent-1",
      assetId: 41,
      projectId: undefined,
    });
  });

  it("does not retry creation after an asset has been uploaded", async () => {
    const post = vi
      .fn()
      .mockResolvedValueOnce({ data: makeOkEnvelope({ id: 41 }) })
      .mockRejectedValueOnce(new Error("create failed"));
    const { result } = renderHook(
      () => ({
        drafts: useStagedSkillDrafts([], "agent-1"),
        registry: useSkillSaveRegistry(),
      }),
      { wrapper: makeWrapper(createTestApiClient({ post })) },
    );

    act(() => {
      result.current.drafts.stageFiles([
        new File(["# Search"], "search.md", { type: "text/markdown" }),
      ]);
    });
    const target = result.current.registry.dirtyTargets[0];
    if (!target) {
      throw new Error("Expected staged skill target");
    }
    await act(async () => {
      await expect(target.save("agent-1")).rejects.toThrow("create failed");
    });

    expect(result.current.drafts.drafts[0]).toMatchObject({
      assetId: 41,
      status: "failed",
    });
    expect(result.current.registry.hasRetryableFailure).toBe(false);
    await act(async () => {
      expect(await result.current.registry.retryAll()).toBe(false);
    });
    await act(async () => {
      await expect(target.save("agent-1")).rejects.toThrow(
        "Skill creation cannot be retried safely",
      );
    });
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("removes only the successfully saved draft", async () => {
    const post = vi
      .fn()
      .mockResolvedValueOnce({ data: makeOkEnvelope({ id: 41 }) })
      .mockResolvedValueOnce({
        data: makeOkEnvelope({
          skill: {
            id: 9,
            agentId: "agent-1",
            name: "Search",
            description: "",
            version: "v1",
            status: 1,
            assetId: 41,
            creatorUsername: "",
            failReason: "",
            projectId: 1,
            createdAt: 1,
            updatedAt: "2",
          },
        }),
      });
    const { result } = renderHook(
      () => ({
        drafts: useStagedSkillDrafts(),
        registry: useSkillSaveRegistry(),
      }),
      { wrapper: makeWrapper(createTestApiClient({ post })) },
    );

    act(() => {
      result.current.drafts.stageFiles([
        new File(["# Search"], "search.md", { type: "text/markdown" }),
        new File(["# Research"], "research.md", { type: "text/markdown" }),
      ]);
    });
    const firstTarget = result.current.registry.dirtyTargets[0];
    if (!firstTarget) {
      throw new Error("Expected first staged skill target");
    }

    await act(async () => {
      await firstTarget.save("agent-1");
    });

    expect(result.current.drafts.drafts).toMatchObject([
      { id: "skill-draft-2", file: { name: "research.md" }, status: "pending" },
    ]);
    expect(
      result.current.registry.dirtyTargets.map((target) => target.id),
    ).toEqual(["skill-draft-2"]);
  });

  it("persists a newly staged batch immediately", async () => {
    const post = vi
      .fn()
      .mockResolvedValueOnce({ data: makeOkEnvelope({ id: 41 }) })
      .mockResolvedValueOnce(skillResponse(9, 41, "Search"));
    const { result } = renderHook(() => useStagedSkillDrafts(), {
      wrapper: makeWrapper(createTestApiClient({ post })),
    });
    let ids: string[] = [];
    act(() => {
      ids = result.current.stageFiles([
        new File(["# Search"], "search.md", { type: "text/markdown" }),
      ]);
    });

    let batch: SaveDraftBatchResult | undefined;
    await act(async () => {
      batch = await result.current.saveDrafts(ids, "agent-1");
    });

    expect(batch).toEqual({
      successCount: 1,
      failedCount: 0,
      skippedCount: 0,
      anyUploading: true,
    });
    expect(result.current.drafts).toEqual([]);
  });

  it("saves a draft from an uploading response with blank metadata", async () => {
    const post = vi
      .fn()
      .mockResolvedValueOnce({ data: makeOkEnvelope({ id: 41 }) })
      .mockResolvedValueOnce(skillResponse(9, 41, "", ""));
    const { result } = renderHook(() => useStagedSkillDrafts(), {
      wrapper: makeWrapper(createTestApiClient({ post })),
    });
    let ids: string[] = [];
    act(() => {
      ids = result.current.stageFiles([
        new File(["# Search"], "search.md", { type: "text/markdown" }),
      ]);
    });

    let batch: SaveDraftBatchResult | undefined;
    await act(async () => {
      batch = await result.current.saveDrafts(ids, "agent-1");
    });

    expect(batch).toMatchObject({ successCount: 1, failedCount: 0 });
    expect(result.current.drafts).toEqual([]);
    expect(post).toHaveBeenCalledTimes(2);
    expect(post).toHaveBeenNthCalledWith(2, "/skills", {
      agentId: "agent-1",
      assetId: 41,
      projectId: undefined,
    });
  });

  it("retains a create failure without replaying it", async () => {
    const post = vi
      .fn()
      .mockResolvedValueOnce({ data: makeOkEnvelope({ id: 41 }) })
      .mockResolvedValueOnce({ data: makeOkEnvelope({ id: 42 }) })
      .mockResolvedValueOnce(skillResponse(9, 41, "Search"))
      .mockRejectedValueOnce(new Error("create failed"));
    const { result } = renderHook(
      () => ({
        drafts: useStagedSkillDrafts([], "agent-1"),
        registry: useSkillSaveRegistry(),
      }),
      { wrapper: makeWrapper(createTestApiClient({ post })) },
    );
    let ids: string[] = [];
    act(() => {
      ids = result.current.drafts.stageFiles([
        new File(["# Search"], "search.md", { type: "text/markdown" }),
        new File(["# Research"], "research.md", { type: "text/markdown" }),
      ]);
    });

    let batch: SaveDraftBatchResult | undefined;
    await act(async () => {
      batch = await result.current.drafts.saveDrafts(ids, "agent-1");
    });

    expect(batch).toEqual({
      successCount: 1,
      failedCount: 1,
      skippedCount: 0,
      anyUploading: true,
    });
    expect(result.current.drafts.drafts).toMatchObject([
      { id: "skill-draft-2", assetId: 42, status: "failed" },
    ]);
    await act(async () => {
      expect(await result.current.registry.retryAll()).toBe(false);
    });
    expect(post).toHaveBeenCalledTimes(4);
  });

  it("shares one in-flight request between immediate and page saves", async () => {
    let resolveAsset: ((value: { data: unknown }) => void) | undefined;
    const assetResponse = new Promise<{ data: unknown }>((resolve) => {
      resolveAsset = resolve;
    });
    const post = vi
      .fn()
      .mockReturnValueOnce(assetResponse)
      .mockResolvedValueOnce(skillResponse(9, 41, "Search"));
    const { result } = renderHook(
      () => ({
        drafts: useStagedSkillDrafts(),
        registry: useSkillSaveRegistry(),
      }),
      { wrapper: makeWrapper(createTestApiClient({ post })) },
    );
    let ids: string[] = [];
    act(() => {
      ids = result.current.drafts.stageFiles([
        new File(["# Search"], "search.md", { type: "text/markdown" }),
      ]);
    });
    const target = result.current.registry.dirtyTargets[0];
    if (!target) {
      throw new Error("Expected staged draft target");
    }

    let immediate: Promise<SaveDraftBatchResult> | undefined;
    let pageSave: Promise<void> | undefined;
    act(() => {
      immediate = result.current.drafts.saveDrafts(ids, "agent-1");
      pageSave = target.save("agent-1");
    });
    await waitFor(() => expect(post).toHaveBeenCalledOnce());
    expect(result.current.registry.dirtyTargets).toEqual([]);

    await act(async () => {
      resolveAsset?.({ data: makeOkEnvelope({ id: 41 }) });
      await Promise.all([immediate, pageSave]);
    });
    expect(post).toHaveBeenCalledTimes(2);
    expect(result.current.drafts.drafts).toEqual([]);
  });

  it("reports a missing draft as skipped", async () => {
    const post = vi.fn();
    const { result } = renderHook(() => useStagedSkillDrafts(), {
      wrapper: makeWrapper(createTestApiClient({ post })),
    });

    let batch: SaveDraftBatchResult | undefined;
    await act(async () => {
      batch = await result.current.saveDrafts(["missing"], "agent-1");
    });

    expect(batch).toEqual({
      successCount: 0,
      failedCount: 0,
      skippedCount: 1,
      anyUploading: false,
    });
    expect(post).not.toHaveBeenCalled();
  });

  it("reports an already saved draft as skipped", async () => {
    const post = vi.fn();
    const savedDraft = {
      id: "skill-draft-1",
      file: new File(["# Search"], "search.md", { type: "text/markdown" }),
      status: "saved" as const,
    };
    const { result } = renderHook(() => useStagedSkillDrafts([savedDraft]), {
      wrapper: makeWrapper(createTestApiClient({ post })),
    });

    let batch: SaveDraftBatchResult | undefined;
    await act(async () => {
      batch = await result.current.saveDrafts([savedDraft.id], "agent-1");
    });

    expect(batch).toEqual({
      successCount: 0,
      failedCount: 0,
      skippedCount: 1,
      anyUploading: false,
    });
    expect(post).not.toHaveBeenCalled();
  });

  it("allocates a new ID after a noncontiguous handoff draft", () => {
    const apiClient = createTestApiClient();
    const initialDrafts = [
      {
        id: "skill-draft-2",
        file: new File(["# Search"], "search.md", {
          type: "text/markdown",
        }),
        status: "failed" as const,
      },
    ];
    const { result } = renderHook(() => useStagedSkillDrafts(initialDrafts), {
      wrapper: makeWrapper(apiClient),
    });

    act(() => {
      result.current.stageFiles([
        new File(["# Research"], "research.md", {
          type: "text/markdown",
        }),
      ]);
    });

    expect(result.current.drafts.map((draft) => draft.id)).toEqual([
      "skill-draft-2",
      "skill-draft-3",
    ]);
  });
});
