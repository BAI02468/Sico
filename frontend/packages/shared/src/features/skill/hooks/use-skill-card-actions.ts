import { t } from "@lingui/core/macro";
import { toast } from "@sico/ui";

import {
  useUpdateSkillMutation,
  useUploadSkillAssetMutation,
} from "./use-skill-mutations";
import {
  type SkillAction,
  type SkillFile,
  type SkillItem,
  type SkillVersion,
} from "../schemas/skill";
import { type UpdateSkillInput } from "../services/skills";
import { assertSafeAssetUrl } from "../utils";

export type SkillCardSaveInput = {
  files?: SkillFile[];
  actions?: SkillAction[];
};

export type SkillCardSaveOptions = {
  showToast?: boolean;
  currentVersion?: string;
};

export type SkillCardActions = {
  downloadZip: () => void;
  save: (
    changes: SkillCardSaveInput,
    options?: SkillCardSaveOptions,
  ) => Promise<string>;
  replaceConfirm: (files: File[]) => Promise<void>;
  replacing: boolean;
};

function toastReplaceFailed(): void {
  toast.error(
    t({
      id: "skill.cardActions.replaceFailed",
      message: "Failed to replace skill",
    }),
  );
}

async function replaceWithAsset({
  files,
  uploadAsset,
  updateSkill,
  skill,
  selectedVersion,
  onReplaced,
}: {
  files: File[];
  uploadAsset: ReturnType<typeof useUploadSkillAssetMutation>;
  updateSkill: ReturnType<typeof useUpdateSkillMutation>;
  skill: SkillItem;
  selectedVersion: string;
  onReplaced: (version: string) => void;
}): Promise<void> {
  const file = files[0];
  if (!file) {
    return;
  }

  try {
    const assetId = await uploadAsset.mutateAsync(file);
    const result = await updateSkill.mutateAsync({
      id: skill.id,
      currentVersion: selectedVersion,
      assetId,
    });
    toast.success(
      t({
        id: "skill.cardActions.skillReplaced",
        message: "Skill replaced",
      }),
      { invert: true },
    );
    onReplaced(result.version);
  } catch (error) {
    toastReplaceFailed();
    throw error;
  }
}

function triggerZipDownload(skill: SkillItem, version: SkillVersion): void {
  let href: string;
  try {
    href = assertSafeAssetUrl(version.url);
  } catch {
    toast.error(
      t({
        id: "skill.cardActions.downloadBlocked",
        message: "This file can't be downloaded.",
      }),
    );
    return;
  }
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = `${skill.name}-${version.version}.zip`;
  anchor.click();
}

function buildUpdateInput(
  skill: SkillItem,
  currentVersion: string,
  changes: SkillCardSaveInput,
  activeVersion: SkillVersion | undefined,
): UpdateSkillInput {
  const isSingleMarkdown = Boolean(
    activeVersion?.url.toLowerCase().endsWith(".md"),
  );
  return {
    id: skill.id,
    currentVersion,
    files:
      changes.files && isSingleMarkdown
        ? changes.files.map((file) => ({ ...file, path: "SKILL.md" }))
        : changes.files,
    actions: changes.actions,
  };
}

async function saveSkill(
  updateSkill: ReturnType<typeof useUpdateSkillMutation>,
  input: UpdateSkillInput,
  showToast: boolean,
): Promise<string> {
  if (!showToast) {
    return (await updateSkill.mutateAsync(input)).version;
  }
  const savingToastId = toast.loading(
    t({ id: "skill.cardActions.saving", message: "Saving changes ..." }),
  );
  try {
    const result = await updateSkill.mutateAsync(input);
    toast.dismiss(savingToastId);
    toast.success(
      t({ id: "skill.cardActions.saved", message: "Skill saved" }),
      { invert: true },
    );
    return result.version;
  } catch (error) {
    toast.dismiss(savingToastId);
    toast.error(
      t({
        id: "skill.cardActions.saveFailed",
        message: "Failed to save skill",
      }),
    );
    throw error;
  }
}

export function useSkillCardActions(
  skill: SkillItem,
  selectedVersion: string,
  activeVersion: SkillVersion | undefined,
  onReplaced: (version: string) => void,
): SkillCardActions {
  const updateSkill = useUpdateSkillMutation();
  const uploadAsset = useUploadSkillAssetMutation();

  const downloadZip = (): void => {
    if (activeVersion?.url) {
      triggerZipDownload(skill, activeVersion);
    }
  };

  const save = (
    changes: SkillCardSaveInput,
    {
      showToast = true,
      currentVersion = selectedVersion,
    }: SkillCardSaveOptions = {},
  ): Promise<string> =>
    saveSkill(
      updateSkill,
      buildUpdateInput(skill, currentVersion, changes, activeVersion),
      showToast,
    );

  const replaceConfirm = (files: File[]): Promise<void> =>
    replaceWithAsset({
      files,
      uploadAsset,
      updateSkill,
      skill,
      selectedVersion,
      onReplaced,
    });

  return {
    downloadZip,
    save,
    replaceConfirm,
    replacing: uploadAsset.isPending || updateSkill.isPending,
  };
}
