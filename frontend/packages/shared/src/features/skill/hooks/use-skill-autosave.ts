import axios from "axios";
import { type RefObject, useEffect, useRef } from "react";

import type { SkillCardSaveInput } from "./use-skill-card-actions";
import type { SkillEditSnapshot } from "./use-skill-card-edits";
import {
  type LatestSaveQueue,
  useLatestSaveQueue,
} from "../../../hooks/use-latest-save-queue";
import type { SkillFile } from "../schemas/skill";
import {
  changedSkillActions,
  changedSkillFiles,
  skillEditSnapshotsEqual,
} from "../utils/skill-edit-diff";

export type SkillAutosaveSnapshot = SkillEditSnapshot & {
  changedFiles: SkillFile[];
  actionsChanged: boolean;
};

function useSyncSelectedVersion({
  selectedVersion,
  baseline,
  versionRef,
  selectedVersionRef,
  baselineRef,
}: {
  selectedVersion: string;
  baseline: SkillEditSnapshot;
  versionRef: RefObject<string>;
  selectedVersionRef: RefObject<string>;
  baselineRef: RefObject<SkillEditSnapshot>;
}): void {
  useEffect(() => {
    if (selectedVersionRef.current !== selectedVersion) {
      selectedVersionRef.current = selectedVersion;
      versionRef.current = selectedVersion;
      baselineRef.current = baseline;
    }
  }, [baseline, baselineRef, selectedVersion, selectedVersionRef, versionRef]);
}

function useSyncSkillBaseline(
  baseline: SkillEditSnapshot,
  baselineRef: RefObject<SkillEditSnapshot>,
  hasChanges: boolean,
  hasUnsettled: boolean,
): void {
  useEffect(() => {
    if (!hasChanges && !hasUnsettled) {
      baselineRef.current = baseline;
    }
  }, [baseline, baselineRef, hasChanges, hasUnsettled]);
}

function useScheduleSkillAutosave({
  enabled,
  snapshot,
  hasChanges,
  queue,
}: {
  enabled: boolean;
  snapshot: SkillAutosaveSnapshot;
  hasChanges: boolean;
  queue: LatestSaveQueue<SkillAutosaveSnapshot>;
}): void {
  const { cancelPending, hasUnsettled, schedule, status } = queue;
  useEffect(() => {
    if (!enabled) {
      cancelPending();
      return;
    }
    if (hasChanges || status === "saving") {
      schedule(snapshot);
    } else if (hasUnsettled) {
      cancelPending();
    }
  }, [
    cancelPending,
    enabled,
    hasChanges,
    hasUnsettled,
    schedule,
    snapshot,
    status,
  ]);
}

function useVersionedSaveQueue({
  baselineRef,
  versionRef,
  onSave,
  onAcknowledge,
}: {
  baselineRef: RefObject<SkillEditSnapshot>;
  versionRef: RefObject<string>;
  onSave: (changes: SkillCardSaveInput, version: string) => Promise<string>;
  onAcknowledge: (snapshot: SkillEditSnapshot) => void;
}): LatestSaveQueue<SkillAutosaveSnapshot> {
  return useLatestSaveQueue<SkillAutosaveSnapshot>({
    equals: skillEditSnapshotsEqual,
    save: async (sent) => {
      const changedFiles = changedSkillFiles(
        sent.files,
        baselineRef.current.files,
      );
      versionRef.current = await onSave(
        {
          files: changedFiles.length > 0 ? changedFiles : undefined,
          actions:
            changedSkillActions(sent.actions, baselineRef.current.actions)
              .length > 0
              ? sent.actions
              : undefined,
        },
        versionRef.current,
      );
    },
    onSuccess: (sent) => {
      baselineRef.current = sent;
      onAcknowledge(sent);
    },
    isConflict: (error) =>
      axios.isAxiosError(error) && error.response?.status === 409,
  });
}

export function useSkillAutosave({
  enabled,
  selectedVersion,
  snapshot,
  baseline,
  hasChanges,
  onSave,
  onAcknowledge,
}: {
  enabled: boolean;
  selectedVersion: string;
  snapshot: SkillAutosaveSnapshot;
  baseline: SkillEditSnapshot;
  hasChanges: boolean;
  onSave: (
    changes: SkillCardSaveInput,
    currentVersion: string,
  ) => Promise<string>;
  onAcknowledge: (snapshot: SkillEditSnapshot) => void;
}): LatestSaveQueue<SkillAutosaveSnapshot> {
  const versionRef = useRef(selectedVersion);
  const selectedVersionRef = useRef(selectedVersion);
  const baselineRef = useRef(baseline);
  const queue = useVersionedSaveQueue({
    baselineRef,
    versionRef,
    onSave,
    onAcknowledge,
  });

  useSyncSelectedVersion({
    selectedVersion,
    baseline,
    versionRef,
    selectedVersionRef,
    baselineRef,
  });
  useSyncSkillBaseline(baseline, baselineRef, hasChanges, queue.hasUnsettled);
  useScheduleSkillAutosave({ enabled, snapshot, hasChanges, queue });
  return queue;
}
