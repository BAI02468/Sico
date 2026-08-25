import { type ReactElement, useState } from "react";

import { useSkillCardActions } from "../hooks/use-skill-card-actions";
import { useDeleteSkillMutation } from "../hooks/use-skill-mutations";
import { useSkillVersionFlow } from "../hooks/use-skill-version-flow";
import { type SkillFile, type SkillItem } from "../schemas/skill";
import { findActiveVersion } from "../utils";
import { UploadSkillDialog } from "./dialogs/upload-skill-dialog";
import { SkillCardDeleteDialog } from "./skill-card-delete-dialog";
import { useZipFiles } from "../hooks/use-zip-files";
import { SkillCard } from "./skill-list/skill-card";

const EMPTY_FILES: SkillFile[] = [];

export function SkillCardContainer({
  skill,
  editable,
}: {
  skill: SkillItem;
  editable: boolean;
}): ReactElement {
  const [expanded, setExpanded] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const flow = useSkillVersionFlow(skill, expanded);
  const deleteSkill = useDeleteSkillMutation();
  const activeVersion = findActiveVersion(flow.versions, flow.selectedVersion);
  const download = useZipFiles(activeVersion?.url);
  const originalFiles = activeVersion?.url
    ? download.files
    : (activeVersion?.files ?? EMPTY_FILES);
  const actions = useSkillCardActions(
    skill,
    flow.selectedVersion,
    activeVersion,
    (version) => {
      setReplaceOpen(false);
      flow.startParsingVersion(version);
    },
  );
  const handleSave = async (
    changes: Parameters<typeof actions.save>[0],
    options?: Parameters<typeof actions.save>[1],
  ): Promise<string> => {
    const version = await actions.save(changes, options);
    flow.startParsingVersion(version);
    return version;
  };

  return (
    <>
      <SkillCard
        skill={skill}
        versions={flow.versions}
        status={skill.status}
        parsing={flow.parsing}
        detailLoading={expanded && flow.detail.isPending}
        expanded={expanded}
        editable={editable}
        onToggle={() => setExpanded((prev) => !prev)}
        originalFiles={originalFiles}
        filesLoading={download.isLoading}
        filesProgress={download.progress}
        filesError={download.error}
        selectedVersion={flow.selectedVersion}
        onSelectVersion={flow.selectVersion}
        onReplace={() => editable && setReplaceOpen(true)}
        onDownloadZip={actions.downloadZip}
        onDelete={() => editable && setPendingDelete(true)}
        onSave={handleSave}
      />
      <SkillCardDeleteDialog
        open={pendingDelete}
        onOpenChange={setPendingDelete}
        skill={skill}
        deleteSkill={deleteSkill}
      />
      <UploadSkillDialog
        open={replaceOpen}
        mode="replace"
        pending={actions.replacing}
        onOpenChange={setReplaceOpen}
        onConfirm={actions.replaceConfirm}
      />
    </>
  );
}
