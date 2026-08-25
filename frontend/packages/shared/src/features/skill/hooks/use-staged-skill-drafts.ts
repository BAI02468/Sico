import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useCreateSkillMutation,
  useUploadSkillAssetMutation,
} from "./use-skill-mutations";
import type { SaveQueueStatus } from "../../../hooks/use-latest-save-queue";
import { useSkillSaveRegistry } from "../components/setup/skill-save-registry";
import { type SkillItem, SkillStatusSchema } from "../schemas/skill";

export type StagedSkillDraft = {
  id: string;
  file: File;
  assetId?: number;
  status: "pending" | "saving" | "failed" | "saved";
};

export type SaveDraftBatchResult = {
  successCount: number;
  failedCount: number;
  skippedCount: number;
  anyUploading: boolean;
};

type DraftState = {
  drafts: StagedSkillDraft[];
  draftsRef: RefObject<StagedSkillDraft[]>;
  stageFiles: (files: File[]) => string[];
  removeDraft: (id: string) => void;
  updateDrafts: (
    update: (current: StagedSkillDraft[]) => StagedSkillDraft[],
  ) => void;
};

type SaveDraft = (
  id: string,
  agentId: string,
) => Promise<SkillItem | undefined>;

type StagedSkillDraftActions = Omit<
  DraftState,
  "draftsRef" | "updateDrafts"
> & {
  saveDrafts: (ids: string[], agentId: string) => Promise<SaveDraftBatchResult>;
};

function replaceDraft(
  drafts: StagedSkillDraft[],
  id: string,
  update: (draft: StagedSkillDraft) => StagedSkillDraft,
): StagedSkillDraft[] {
  return drafts.map((draft) => (draft.id === id ? update(draft) : draft));
}

function isUnsafeCreateRetry(draft: StagedSkillDraft): boolean {
  return draft.status === "failed" && draft.assetId !== undefined;
}

function nextDraftId(initialDrafts: StagedSkillDraft[]): number {
  return (
    Math.max(
      0,
      ...initialDrafts.map((draft) => {
        const suffix = Number(draft.id.replace("skill-draft-", ""));
        return Number.isSafeInteger(suffix) ? suffix : 0;
      }),
    ) + 1
  );
}

function useDraftState(initialDrafts: StagedSkillDraft[]): DraftState {
  const nextId = useRef(nextDraftId(initialDrafts));
  const draftsRef = useRef<StagedSkillDraft[]>(initialDrafts);
  const [drafts, setDrafts] = useState<StagedSkillDraft[]>(initialDrafts);
  const updateDrafts = useCallback(
    (update: (current: StagedSkillDraft[]) => StagedSkillDraft[]) => {
      const next = update(draftsRef.current);
      draftsRef.current = next;
      setDrafts(next);
    },
    [],
  );
  const stageFiles = useCallback(
    (files: File[]): string[] => {
      const staged = files.map((file) => {
        const id = nextId.current;
        nextId.current += 1;
        return { id: `skill-draft-${id}`, file, status: "pending" as const };
      });
      updateDrafts((current) => [...current, ...staged]);
      return staged.map((draft) => draft.id);
    },
    [updateDrafts],
  );
  const removeDraft = useCallback(
    (id: string): void => {
      updateDrafts((current) => current.filter((draft) => draft.id !== id));
    },
    [updateDrafts],
  );
  return { drafts, draftsRef, stageFiles, removeDraft, updateDrafts };
}

async function persistDraft(
  state: Pick<DraftState, "draftsRef" | "updateDrafts">,
  mutations: {
    createSkill: ReturnType<typeof useCreateSkillMutation>["mutateAsync"];
    uploadAsset: ReturnType<typeof useUploadSkillAssetMutation>["mutateAsync"];
  },
  id: string,
  agentId: string,
): Promise<SkillItem | undefined> {
  const draft = state.draftsRef.current.find((item) => item.id === id);
  if (!draft || draft.status === "saved") {
    return undefined;
  }
  if (isUnsafeCreateRetry(draft)) {
    throw new Error("Skill creation cannot be retried safely");
  }
  state.updateDrafts((current) =>
    replaceDraft(current, id, (item) => ({ ...item, status: "saving" })),
  );
  try {
    const assetId = draft.assetId ?? (await mutations.uploadAsset(draft.file));
    if (!draft.assetId) {
      state.updateDrafts((current) =>
        replaceDraft(current, id, (item) => ({ ...item, assetId })),
      );
    }
    const skill = await mutations.createSkill({ agentId, assetId });
    state.updateDrafts((current) => current.filter((item) => item.id !== id));
    return skill;
  } catch (error) {
    state.updateDrafts((current) =>
      replaceDraft(current, id, (item) => ({ ...item, status: "failed" })),
    );
    throw error;
  }
}

function useDraftSave({
  draftsRef,
  updateDrafts,
}: Pick<DraftState, "draftsRef" | "updateDrafts">): SaveDraft {
  const { mutateAsync: createSkill } = useCreateSkillMutation();
  const { mutateAsync: uploadAsset } = useUploadSkillAssetMutation();
  const inFlight = useRef(new Map<string, Promise<SkillItem | undefined>>());
  return useCallback(
    (id: string, agentId: string): Promise<SkillItem | undefined> => {
      const current = inFlight.current.get(id);
      if (current) {
        return current;
      }
      const tracked = persistDraft(
        { draftsRef, updateDrafts },
        { createSkill, uploadAsset },
        id,
        agentId,
      ).finally(() => {
        if (inFlight.current.get(id) === tracked) {
          inFlight.current.delete(id);
        }
      });
      inFlight.current.set(id, tracked);
      return tracked;
    },
    [createSkill, draftsRef, updateDrafts, uploadAsset],
  );
}

async function saveDraftBatch(
  saveDraft: SaveDraft,
  ids: string[],
  agentId: string,
): Promise<SaveDraftBatchResult> {
  const results = await Promise.allSettled(
    ids.map((id) => saveDraft(id, agentId)),
  );
  const skills = results.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : [],
  );
  return {
    successCount: skills.length,
    failedCount: results.filter((result) => result.status === "rejected")
      .length,
    skippedCount: results.filter(
      (result) => result.status === "fulfilled" && !result.value,
    ).length,
    anyUploading: skills.some(
      (skill) => skill.status === SkillStatusSchema.enum.UPLOADING,
    ),
  };
}

function draftSaveStatus(status: StagedSkillDraft["status"]): SaveQueueStatus {
  if (status === "saving") {
    return "saving";
  }
  if (status === "failed") {
    return "error";
  }
  if (status === "pending") {
    return "scheduled";
  }
  return "saved";
}

async function flushDraft(
  saveDraft: SaveDraft,
  id: string,
  agentId: string,
): Promise<boolean> {
  try {
    await saveDraft(id, agentId);
    return true;
  } catch {
    return false;
  }
}

function useRegisterStagedDrafts({
  agentId,
  register,
  saveDraft,
  drafts,
  draftsRef,
  removeDraft,
}: {
  agentId: string | undefined;
  register: ReturnType<typeof useSkillSaveRegistry>["register"];
  saveDraft: SaveDraft;
  drafts: StagedSkillDraft[];
  draftsRef: RefObject<StagedSkillDraft[]>;
  removeDraft: (id: string) => void;
}): void {
  useEffect(() => {
    const unregister = drafts.map((draft) =>
      register({
        id: draft.id,
        dirty: draft.status === "pending" || draft.status === "failed",
        status: draftSaveStatus(draft.status),
        save: async (nextAgentId) => {
          await saveDraft(draft.id, nextAgentId);
        },
        discard: () => removeDraft(draft.id),
        ...(agentId && !isUnsafeCreateRetry(draft)
          ? {
              flush: () => flushDraft(saveDraft, draft.id, agentId),
              retry: () => flushDraft(saveDraft, draft.id, agentId),
            }
          : {}),
        handoffDraft: () =>
          draftsRef.current.find((item) => item.id === draft.id),
      }),
    );
    return () => {
      for (const remove of unregister) {
        remove();
      }
    };
  }, [agentId, drafts, draftsRef, register, removeDraft, saveDraft]);
}

export function useStagedSkillDrafts(
  initialDrafts: StagedSkillDraft[] = [],
  agentId?: string,
): StagedSkillDraftActions {
  const { register } = useSkillSaveRegistry();
  const state = useDraftState(initialDrafts);
  const saveDraft = useDraftSave(state);
  const saveDrafts = useCallback(
    (ids: string[], nextAgentId: string) =>
      saveDraftBatch(saveDraft, ids, nextAgentId),
    [saveDraft],
  );
  useRegisterStagedDrafts({
    agentId,
    register,
    saveDraft,
    drafts: state.drafts,
    draftsRef: state.draftsRef,
    removeDraft: state.removeDraft,
  });

  return {
    drafts: state.drafts,
    stageFiles: state.stageFiles,
    removeDraft: state.removeDraft,
    saveDrafts,
  };
}
