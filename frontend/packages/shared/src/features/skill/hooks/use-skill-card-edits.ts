import { type Dispatch, type SetStateAction, useMemo, useState } from "react";

import {
  type SkillAction,
  type SkillFile,
  type SkillVersion,
} from "../schemas/skill";
import {
  changedSkillActions,
  changedSkillFiles,
  type SkillEditSnapshot,
} from "../utils/skill-edit-diff";

export type { SkillEditSnapshot } from "../utils/skill-edit-diff";

export type SkillCardEdits = SkillEditSnapshot & {
  snapshot: SkillEditSnapshot;
  filesBaseline: SkillFile[];
  actionsBaseline: SkillAction[];
  changedFiles: SkillFile[];
  changedActions: SkillAction[];
  hasChanges: boolean;
  onContentChange: (path: string, content: string) => void;
  onActionChange: (index: number, action: SkillAction) => void;
  commitBaseline: () => void;
  commitSnapshot: (acknowledged: SkillEditSnapshot) => void;
};

type VersionedEditState = {
  files: SkillFile[];
  setFiles: Dispatch<SetStateAction<SkillFile[]>>;
  filesBaseline: SkillFile[];
  setFilesBaseline: Dispatch<SetStateAction<SkillFile[]>>;
  actions: SkillAction[];
  setActions: Dispatch<SetStateAction<SkillAction[]>>;
  actionsBaseline: SkillAction[];
  setActionsBaseline: Dispatch<SetStateAction<SkillAction[]>>;
};

function useVersionedEditState(
  originalFiles: SkillFile[],
  activeVersion: SkillVersion | undefined,
): VersionedEditState {
  const [versionKey, setVersionKey] = useState(activeVersion?.version);
  const [filesSource, setFilesSource] = useState(originalFiles);
  const [filesBaseline, setFilesBaseline] = useState(originalFiles);
  const [files, setFiles] = useState<SkillFile[]>(originalFiles);
  const [actionsBaseline, setActionsBaseline] = useState<SkillAction[]>(
    activeVersion?.actions ?? [],
  );
  const [actions, setActions] = useState<SkillAction[]>(
    activeVersion?.actions ?? [],
  );
  if (activeVersion && activeVersion.version !== versionKey) {
    const actionsDirty =
      changedSkillActions(actions, actionsBaseline).length > 0;
    setVersionKey(activeVersion.version);
    setActionsBaseline(activeVersion.actions);
    if (!actionsDirty) {
      setActions(activeVersion.actions);
    }
  }
  if (originalFiles !== filesSource) {
    const filesDirty = changedSkillFiles(files, filesBaseline).length > 0;
    setFilesSource(originalFiles);
    setFilesBaseline(originalFiles);
    if (!filesDirty) {
      setFiles(originalFiles);
    }
  }
  return {
    files,
    setFiles,
    filesBaseline,
    setFilesBaseline,
    actions,
    setActions,
    actionsBaseline,
    setActionsBaseline,
  };
}

export function useSkillCardEdits(
  originalFiles: SkillFile[],
  activeVersion: SkillVersion | undefined,
): SkillCardEdits {
  const state = useVersionedEditState(originalFiles, activeVersion);
  const snapshot = useMemo(
    () => ({ files: state.files, actions: state.actions }),
    [state.actions, state.files],
  );
  const changedFiles = useMemo(
    () => changedSkillFiles(state.files, state.filesBaseline),
    [state.files, state.filesBaseline],
  );
  const changedActions = useMemo(
    () => changedSkillActions(state.actions, state.actionsBaseline),
    [state.actions, state.actionsBaseline],
  );
  return {
    ...snapshot,
    snapshot,
    filesBaseline: state.filesBaseline,
    actionsBaseline: state.actionsBaseline,
    changedFiles,
    changedActions,
    hasChanges: changedFiles.length > 0 || changedActions.length > 0,
    onContentChange: (path, content) =>
      state.setFiles((current) =>
        current.some((file) => file.path === path)
          ? current.map((file) =>
              file.path === path ? { ...file, content } : file,
            )
          : [...current, { path, content }],
      ),
    onActionChange: (index, action) =>
      state.setActions((current) =>
        current.map((item, itemIndex) => (itemIndex === index ? action : item)),
      ),
    commitBaseline: () => {
      state.setFilesBaseline(state.files);
      state.setActionsBaseline(state.actions);
    },
    commitSnapshot: (acknowledged) => {
      state.setFilesBaseline(acknowledged.files);
      state.setActionsBaseline(acknowledged.actions);
    },
  };
}
