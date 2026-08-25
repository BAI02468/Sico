import type { ReactElement } from "react";

import { SkillCardHeader } from "./skill-card-header";
import type { LatestSaveQueue } from "../../../../hooks/use-latest-save-queue";
import type { SkillAutosaveSnapshot } from "../../hooks/use-skill-autosave";
import type { SkillVersion } from "../../schemas/skill";

export function SkillCardAutosaveHeader({
  name,
  parsing,
  expanded,
  detailLoading,
  editable,
  versions,
  selectedVersion,
  autosave,
  hasChanges,
  onToggle,
  onSelectVersion,
  onReplace,
  onDownloadZip,
  onDelete,
}: {
  name: string;
  parsing: boolean;
  expanded: boolean;
  detailLoading: boolean;
  editable: boolean;
  versions: SkillVersion[];
  selectedVersion: string;
  autosave: LatestSaveQueue<SkillAutosaveSnapshot>;
  hasChanges: boolean;
  onToggle: () => void;
  onSelectVersion: (version: string) => void;
  onReplace: () => void;
  onDownloadZip: () => void;
  onDelete: () => void;
}): ReactElement {
  const actionReady = !hasChanges && !autosave.hasUnsettled;
  return (
    <SkillCardHeader
      name={name}
      parsing={parsing}
      expanded={expanded}
      onToggle={onToggle}
      showControls={!parsing && !detailLoading && actionReady}
      editable={editable}
      versions={versions}
      selectedVersion={selectedVersion}
      onSelectVersion={(version) => {
        if (actionReady) {
          onSelectVersion(version);
        }
      }}
      onReplace={() => {
        if (actionReady) {
          onReplace();
        }
      }}
      onDownloadZip={onDownloadZip}
      onDelete={() => {
        if (actionReady) {
          onDelete();
        }
      }}
    />
  );
}
