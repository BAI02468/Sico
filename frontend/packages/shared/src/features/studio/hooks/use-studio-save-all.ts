import { useCallback, useEffect, useRef } from "react";

import type { SkillSaveTarget } from "../../skill";
import type { SetupBasicInfoValues } from "../../skill/components/setup/setup-basic-info-values";
import type { StagedSkillDraft } from "../../skill/hooks/use-staged-skill-drafts";
import {
  runSaveTargets,
  type SaveTargetsResult,
} from "../utils/run-save-targets";

type StudioSaveTarget = SkillSaveTarget & {
  handoffDraft?: () => StagedSkillDraft | undefined;
};

type SaveAllInput = {
  values: SetupBasicInfoValues;
  basicDirty: boolean;
  targets: StudioSaveTarget[];
  openPublishAfterSave: boolean;
};

type StudioSaveAllOptions = {
  agentId?: string;
  saveBasic: (values: SetupBasicInfoValues) => Promise<string | void>;
  onCreated?: (
    agentId: string,
    failedDrafts: StagedSkillDraft[],
    openPublishAfterTransition: boolean,
  ) => Promise<void>;
};

type SaveDependencies = StudioSaveAllOptions & {
  activeAgentId: string | undefined;
  getOpenPublishAfterSave: () => boolean;
  setCreatedAgentId: (agentId: string) => void;
};

export type StudioSaveAllResult = SaveTargetsResult & {
  basicSaved: boolean;
  created: boolean;
};

function failedDrafts(
  targets: StudioSaveTarget[],
  result: SaveTargetsResult,
): StagedSkillDraft[] {
  return targets
    .flatMap((target) =>
      result.failed.includes(target.id) ? [target.handoffDraft?.()] : [],
    )
    .filter((draft): draft is StagedSkillDraft => draft !== undefined);
}

export function useStudioSaveAll({
  agentId,
  saveBasic,
  onCreated,
}: StudioSaveAllOptions): {
  saveAll: (input: SaveAllInput) => Promise<StudioSaveAllResult>;
} {
  const activeAgentId = useRef(agentId);
  const inFlight = useRef<Promise<StudioSaveAllResult> | null>(null);
  const openPublishAfterSave = useRef(false);

  useEffect(() => {
    if (agentId) {
      activeAgentId.current = agentId;
    }
  }, [agentId]);

  const saveAll = useCallback(
    (input: SaveAllInput): Promise<StudioSaveAllResult> => {
      if (inFlight.current) {
        openPublishAfterSave.current ||= input.openPublishAfterSave;
        return inFlight.current;
      }
      openPublishAfterSave.current = input.openPublishAfterSave;
      const saving = save(input, {
        activeAgentId: activeAgentId.current,
        getOpenPublishAfterSave: () => openPublishAfterSave.current,
        saveBasic,
        onCreated,
        setCreatedAgentId: (createdAgentId) => {
          activeAgentId.current = createdAgentId;
        },
      });
      inFlight.current = saving;
      saving
        .finally(() => {
          if (inFlight.current === saving) {
            inFlight.current = null;
            openPublishAfterSave.current = false;
          }
        })
        .catch(() => undefined);
      return saving;
    },
    [onCreated, saveBasic],
  );

  return { saveAll };
}

async function save(
  { values, basicDirty, targets }: SaveAllInput,
  dependencies: SaveDependencies,
): Promise<StudioSaveAllResult> {
  if (dependencies.activeAgentId && !basicDirty && targets.length === 0) {
    return { succeeded: [], failed: [], basicSaved: false, created: false };
  }
  if (!dependencies.activeAgentId && dependencies.onCreated) {
    return createAndSave({ values, targets }, dependencies);
  }
  return updateAndSave(
    { values, basicDirty, targets },
    dependencies.activeAgentId ?? "",
    dependencies.saveBasic,
  );
}

async function createAndSave(
  input: Pick<SaveAllInput, "values" | "targets">,
  {
    getOpenPublishAfterSave,
    saveBasic,
    onCreated,
    setCreatedAgentId,
  }: SaveDependencies,
): Promise<StudioSaveAllResult> {
  let agentId: string | void;
  try {
    agentId = await saveBasic(input.values);
  } catch {
    return {
      succeeded: [],
      failed: ["basic"],
      basicSaved: false,
      created: false,
    };
  }
  if (!agentId) {
    return {
      succeeded: [],
      failed: ["basic"],
      basicSaved: false,
      created: false,
    };
  }
  setCreatedAgentId(agentId);
  const result = await runSaveTargets(
    input.targets.map(({ id, save: persist }) => ({
      id,
      save: () => persist(agentId),
    })),
  );
  await onCreated?.(
    agentId,
    failedDrafts(input.targets, result),
    getOpenPublishAfterSave() && result.failed.length === 0,
  );
  return { ...result, basicSaved: true, created: true };
}

async function updateAndSave(
  {
    values,
    basicDirty,
    targets,
  }: Pick<SaveAllInput, "values" | "basicDirty" | "targets">,
  agentId: string,
  saveBasic: StudioSaveAllOptions["saveBasic"],
): Promise<StudioSaveAllResult> {
  const result = await runSaveTargets([
    ...(basicDirty
      ? [
          {
            id: "basic",
            save: async () => {
              await saveBasic(values);
            },
          },
        ]
      : []),
    ...targets.map(({ id, save: targetSave }) => ({
      id,
      save: () => targetSave(agentId),
    })),
  ]);
  return {
    ...result,
    basicSaved: result.succeeded.includes("basic"),
    created: false,
  };
}
