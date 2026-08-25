import { type ReactElement, useEffect, useMemo } from "react";

import { SkillCardAutosaveHeader } from "./skill-card-autosave-header";
import { SkillCardContent } from "./skill-card-content";
import type { LatestSaveQueue } from "../../../../hooks/use-latest-save-queue";
import {
  type SkillAutosaveSnapshot,
  useSkillAutosave,
} from "../../hooks/use-skill-autosave";
import {
  type SkillCardSaveInput,
  type SkillCardSaveOptions,
} from "../../hooks/use-skill-card-actions";
import { useSkillCardEdits } from "../../hooks/use-skill-card-edits";
import {
  type SkillFile,
  type SkillItem,
  type SkillStatus,
  SkillStatusSchema,
  type SkillVersion,
} from "../../schemas/skill";
import { findActiveVersion } from "../../utils";
import { useSkillSaveRegistry } from "../setup/skill-save-registry";

export type SkillCardProps = {
  skill: SkillItem;
  versions: SkillVersion[];
  status: SkillStatus;
  parsing?: boolean;
  detailLoading: boolean;
  expanded: boolean;
  editable: boolean;
  onToggle: () => void;
  originalFiles: SkillFile[];
  filesLoading: boolean;
  filesProgress?: number;
  filesError?: string;
  selectedVersion: string;
  onSelectVersion: (version: string) => void;
  onReplace: () => void;
  onDownloadZip: () => void;
  onDelete: () => void;
  onSave: (
    changes: SkillCardSaveInput,
    options?: SkillCardSaveOptions,
  ) => Promise<string>;
};

function useRegisterSkillAutosave({
  register,
  skillId,
  editable,
  hasChanges,
  autosave,
}: {
  register: ReturnType<typeof useSkillSaveRegistry>["register"];
  skillId: number;
  editable: boolean;
  hasChanges: boolean;
  autosave: LatestSaveQueue<SkillAutosaveSnapshot>;
}): void {
  const { error, flush, hasUnsettled, retry, status } = autosave;
  useEffect(
    () =>
      register({
        id: `skill-${skillId}`,
        dirty: editable && (hasChanges || hasUnsettled),
        status,
        save: async () => {
          if (!(await flush())) {
            throw error;
          }
        },
        flush,
        retry,
      }),
    [
      editable,
      error,
      flush,
      hasChanges,
      hasUnsettled,
      register,
      retry,
      skillId,
      status,
    ],
  );
}

export function SkillCard({
  skill,
  versions,
  status,
  parsing,
  detailLoading,
  expanded,
  editable,
  onToggle,
  originalFiles,
  filesLoading,
  filesProgress = 0,
  filesError = "",
  selectedVersion,
  onSelectVersion,
  onReplace,
  onDownloadZip,
  onDelete,
  onSave,
}: SkillCardProps): ReactElement {
  const { register } = useSkillSaveRegistry();
  const activeVersion = findActiveVersion(versions, selectedVersion);
  const edits = useSkillCardEdits(originalFiles, activeVersion);
  const snapshot = useMemo(
    () => ({
      ...edits.snapshot,
      changedFiles: edits.changedFiles,
      actionsChanged: edits.changedActions.length > 0,
    }),
    [edits.changedActions.length, edits.changedFiles, edits.snapshot],
  );
  const baseline = useMemo(
    () => ({ files: edits.filesBaseline, actions: edits.actionsBaseline }),
    [edits.actionsBaseline, edits.filesBaseline],
  );
  const autosave = useSkillAutosave({
    enabled: editable,
    selectedVersion,
    snapshot,
    baseline,
    hasChanges: edits.hasChanges,
    onSave: (changes, currentVersion) =>
      onSave(changes, { showToast: false, currentVersion }),
    onAcknowledge: edits.commitSnapshot,
  });

  const isParsing = parsing ?? status === SkillStatusSchema.enum.UPLOADING;
  const description = activeVersion?.description ?? skill.description;

  useRegisterSkillAutosave({
    register,
    skillId: skill.id,
    editable,
    hasChanges: edits.hasChanges,
    autosave,
  });

  return (
    <div className="border-stroke-subtle-card-rest bg-surface-basic rounded-xl border px-6 pt-6">
      <SkillCardAutosaveHeader
        name={activeVersion?.name ?? skill.name}
        parsing={isParsing}
        expanded={expanded}
        detailLoading={detailLoading}
        editable={editable}
        versions={versions}
        selectedVersion={selectedVersion}
        autosave={autosave}
        hasChanges={edits.hasChanges}
        onToggle={onToggle}
        onSelectVersion={onSelectVersion}
        onReplace={onReplace}
        onDownloadZip={onDownloadZip}
        onDelete={onDelete}
      />
      <SkillCardContent
        status={status}
        parsing={isParsing}
        failReason={skill.failReason}
        expanded={expanded}
        onExpand={onToggle}
        description={description}
        creatorUsername={activeVersion?.creatorUsername ?? ""}
        detailLoading={detailLoading}
        filesLoading={filesLoading}
        filesProgress={filesProgress}
        filesError={filesError}
        editable={editable}
        files={edits.files}
        actions={edits.actions}
        originalActions={edits.actionsBaseline}
        onContentChange={edits.onContentChange}
        onActionChange={edits.onActionChange}
      />
    </div>
  );
}
