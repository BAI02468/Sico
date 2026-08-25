import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { AxiosInstance } from "axios";
import { createStore, Provider } from "jotai";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  SkillSaveRegistryProvider,
  useSkillSaveRegistry,
} from "@/features/skill/components/setup/skill-save-registry";
import {
  type StagedSkillDraft,
  useStagedSkillDrafts,
} from "@/features/skill/hooks/use-staged-skill-drafts";
import { studioSetupHandoffAtom } from "@/features/studio/atoms/studio-setup-handoff-atom";
import { useStudioSaveAll } from "@/features/studio/hooks/use-studio-save-all";
import { createSingleAgent } from "@/features/studio/services/single-agent-mutations";
import { makeOkEnvelope } from "@/schemas/api";
import { ApiClientProvider } from "@/services/api-client-context";
import { createTestApiClient } from "@/testing/create-test-api-client";

type SaveScenario = {
  drafts: ReturnType<typeof useStagedSkillDrafts>;
  dirtyTargets: ReturnType<typeof useSkillSaveRegistry>["dirtyTargets"];
  saveAll: ReturnType<typeof useStudioSaveAll>["saveAll"];
};

type TestWrapper = {
  Wrapper: ({ children }: { children: ReactNode }) => ReactElement;
  store: ReturnType<typeof createStore>;
};

function makeWrapper(
  apiClient: AxiosInstance,
  store = createStore(),
): TestWrapper {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ApiClientProvider client={apiClient}>
            <SkillSaveRegistryProvider>{children}</SkillSaveRegistryProvider>
          </ApiClientProvider>
        </QueryClientProvider>
      </Provider>
    );
  }

  return { Wrapper, store };
}

function useCreateSave(
  apiClient: AxiosInstance,
  store: ReturnType<typeof createStore>,
): SaveScenario {
  const drafts = useStagedSkillDrafts();
  const { dirtyTargets } = useSkillSaveRegistry();
  const { saveAll } = useStudioSaveAll({
    saveBasic: async ({ name, role }) =>
      (
        await createSingleAgent(apiClient, {
          name,
          role,
          organizationId: 42,
        })
      ).agentId,
    onCreated: async (agentId, failedDrafts, openPublishAfterTransition) => {
      store.set(studioSetupHandoffAtom, (current) => {
        const next = new Map(current);
        next.set(agentId, {
          drafts: failedDrafts,
          openPublishAfterTransition,
        });
        return next;
      });
    },
  });
  return { drafts, dirtyTargets, saveAll };
}

function useEditSave(initialDrafts: StagedSkillDraft[]): SaveScenario {
  const drafts = useStagedSkillDrafts(initialDrafts);
  const { dirtyTargets } = useSkillSaveRegistry();
  const { saveAll } = useStudioSaveAll({
    agentId: "a3c0bc10-6d1c-4b33-a866-f3e1b2b91cde",
    saveBasic: async () => undefined,
  });
  return { drafts, dirtyTargets, saveAll };
}

describe("Create-to-Edit staged Skill handoff", () => {
  it("does not replay a failed Skill create after transition", async () => {
    const post = vi
      .fn()
      .mockResolvedValueOnce({
        data: makeOkEnvelope({
          agentId: "a3c0bc10-6d1c-4b33-a866-f3e1b2b91cde",
        }),
      })
      .mockResolvedValueOnce({ data: makeOkEnvelope({ id: 41 }) })
      .mockRejectedValueOnce(new Error("skill failed"));
    const apiClient = createTestApiClient({ post });
    const { Wrapper, store } = makeWrapper(apiClient);
    const create = renderHook(() => useCreateSave(apiClient, store), {
      wrapper: Wrapper,
    });

    act(() => {
      create.result.current.drafts.stageFiles([
        new File(["# Search"], "search.md", { type: "text/markdown" }),
      ]);
    });
    await act(async () => {
      await create.result.current.saveAll({
        values: { name: "Atlas", role: "researcher" },
        basicDirty: true,
        targets: create.result.current.dirtyTargets,
        openPublishAfterSave: true,
      });
    });

    const handoff = store
      .get(studioSetupHandoffAtom)
      .get("a3c0bc10-6d1c-4b33-a866-f3e1b2b91cde");
    expect(handoff).toMatchObject({
      openPublishAfterTransition: false,
      drafts: [{ id: "skill-draft-1", assetId: 41, status: "failed" }],
    });
    create.unmount();

    const edit = renderHook(() => useEditSave(handoff?.drafts ?? []), {
      wrapper: Wrapper,
    });
    await act(async () => {
      await edit.result.current.saveAll({
        values: { name: "Atlas", role: "researcher" },
        basicDirty: false,
        targets: edit.result.current.dirtyTargets,
        openPublishAfterSave: false,
      });
    });

    expect(post).toHaveBeenCalledTimes(3);
    expect(post).toHaveBeenNthCalledWith(1, "/agent/single_agent", {
      name: "Atlas",
      role: "researcher",
      desc: "",
      organizationId: 42,
    });
    expect(edit.result.current.drafts.drafts).toMatchObject([
      { id: "skill-draft-1", assetId: 41, status: "failed" },
    ]);
  });
});
