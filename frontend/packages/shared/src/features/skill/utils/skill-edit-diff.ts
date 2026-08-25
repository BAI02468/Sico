import type { SkillAction, SkillFile } from "../schemas/skill";

export type SkillEditSnapshot = { files: SkillFile[]; actions: SkillAction[] };

export function changedSkillFiles(
  files: SkillFile[],
  baseline: SkillFile[],
): SkillFile[] {
  return files.filter((file) => {
    const original = baseline.find((item) => item.path === file.path);
    return !original || original.content !== file.content;
  });
}

export function changedSkillActions(
  actions: SkillAction[],
  baseline: SkillAction[],
): SkillAction[] {
  return actions.filter((action, index) => {
    const original = baseline[index];
    return (
      !original ||
      original.name !== action.name ||
      original.description !== action.description ||
      original.advancedSettings !== action.advancedSettings
    );
  });
}

export function skillEditSnapshotsEqual(
  left: SkillEditSnapshot,
  right: SkillEditSnapshot,
): boolean {
  return (
    changedSkillFiles(left.files, right.files).length === 0 &&
    changedSkillFiles(right.files, left.files).length === 0 &&
    changedSkillActions(left.actions, right.actions).length === 0 &&
    changedSkillActions(right.actions, left.actions).length === 0
  );
}
