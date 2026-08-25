import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { toast } from "@sico/ui";
import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";

import type { StudioSetupEditorProps } from "./studio-setup-editor";
import { StudioSetupEditorAutosaveHeader } from "./studio-setup-editor-autosave-header";
import { StudioSetupEditorBody } from "./studio-setup-editor-body";
import { StudioUnsavedChangesGuard } from "./studio-unsaved-changes-guard";
import {
  aggregateSaveQueueStatus,
  type SaveQueueStatus,
} from "../../../hooks/use-latest-save-queue";
import type { SetupBasicInfoValues } from "../../skill/components/setup/setup-basic-info-values";
import { useSkillSaveRegistry } from "../../skill/components/setup/skill-save-registry";
import { useStudioEditAutosave } from "../hooks/use-studio-edit-autosave";
import { useStudioSaveAll } from "../hooks/use-studio-save-all";
import { useStudioSetupForm } from "../hooks/use-studio-setup-form";
import { useStudioSetupSave } from "../hooks/use-studio-setup-save";

const SAVE_FAILED_COPY = msg({
  id: "studio.setupEditor.saveFailed",
  message: "Failed to save changes.",
});

function showUnexpectedSaveError(): void {
  toast.error(i18n._(SAVE_FAILED_COPY));
}

type StudioSetupEditorContentProps = StudioSetupEditorProps & {
  canPublish: boolean;
};

function useStudioSetupFormReset(
  form: ReturnType<typeof useForm<SetupBasicInfoValues>>,
  name: string,
  role: string,
): void {
  useEffect(() => {
    form.reset({ name, role }, { keepDirtyValues: true });
  }, [form, name, role]);
}

function useCombinedAutosave(
  editMode: boolean,
  formDirty: boolean,
  autosave: ReturnType<typeof useStudioEditAutosave>,
  registry: ReturnType<typeof useSkillSaveRegistry>,
): {
  hasChanges: boolean;
  status: SaveQueueStatus;
  flushAll: () => Promise<boolean>;
} {
  const { flush: flushBasic } = autosave;
  const { flushAll: flushSkills } = registry;
  const flushAll = useCallback(async (): Promise<boolean> => {
    const [basicSaved, skillsSaved] = await Promise.all([
      autosave.valid ? flushBasic() : Promise.resolve(false),
      flushSkills(),
    ]);
    return basicSaved && skillsSaved;
  }, [autosave.valid, flushBasic, flushSkills]);
  return {
    hasChanges: editMode
      ? autosave.hasUnsettled || registry.hasUnsettled
      : formDirty || registry.dirtyTargets.length > 0,
    status: aggregateSaveQueueStatus([autosave.status, registry.status]),
    flushAll,
  };
}

async function publishChanges(
  editMode: boolean,
  manualPublish: () => Promise<void>,
  flushAll: () => Promise<boolean>,
  onPublish: (() => void) | undefined,
): Promise<void> {
  if (!editMode) {
    await manualPublish();
    return;
  }
  if (await flushAll()) {
    onPublish?.();
  }
}

export function StudioSetupEditorContent({
  name,
  role,
  creatorUsername,
  roleOptions,
  editable,
  canPublish,
  canManageEditors,
  canDelete,
  agentId,
  initialStagedDrafts,
  onBasicSave,
  onCreated,
  onInitialDraftsConsumed,
  onPublish,
  onManageEditors,
  onDelete,
}: StudioSetupEditorContentProps): React.JSX.Element {
  const form = useStudioSetupForm(name, role);
  const registry = useSkillSaveRegistry();
  const { saveAll } = useStudioSaveAll({
    agentId,
    saveBasic: onBasicSave,
    onCreated,
  });
  const manual = useStudioSetupSave({
    form,
    dirtyTargets: registry.dirtyTargets,
    onPublish,
    saveAll,
  });
  const autosave = useStudioEditAutosave({
    form,
    enabled: agentId !== undefined && editable,
    onSave: onBasicSave,
  });
  const combined = useCombinedAutosave(
    agentId !== undefined,
    form.formState.isDirty,
    autosave,
    registry,
  );
  useStudioSetupFormReset(form, name, role);

  return (
    <>
      <StudioUnsavedChangesGuard
        enabled={agentId !== undefined && combined.hasChanges}
        onFlush={
          agentId !== undefined && editable ? combined.flushAll : undefined
        }
      />
      <StudioSetupEditorAutosaveHeader
        editable={editable}
        editMode={agentId !== undefined}
        canPublish={
          canPublish &&
          !manual.isSaving &&
          (agentId === undefined || autosave.valid)
        }
        canManageEditors={canManageEditors ?? false}
        canDelete={canDelete ?? false}
        status={combined.status}
        valid={autosave.valid}
        canRetry={autosave.status === "error" || registry.hasRetryableFailure}
        saveDisabled={
          manual.isSaving || (agentId !== undefined && !combined.hasChanges)
        }
        onRetry={() => {
          void Promise.all([autosave.retry(), registry.retryAll()]);
        }}
        onDiscard={registry.discardFailed}
        canDiscard={registry.hasDiscardableFailure}
        onConflict={() => window.location.reload()}
        onPublish={() =>
          publishChanges(
            agentId !== undefined,
            manual.publish,
            combined.flushAll,
            onPublish,
          ).catch(showUnexpectedSaveError)
        }
        onManageEditors={onManageEditors}
        onDelete={onDelete}
      />
      <StudioSetupEditorBody
        form={form}
        roleOptions={roleOptions}
        creatorUsername={creatorUsername}
        editable={editable && (agentId !== undefined || !manual.isSaving)}
        agentId={agentId}
        initialStagedDrafts={initialStagedDrafts}
        onInitialDraftsConsumed={onInitialDraftsConsumed}
        onSubmit={manual.submit}
      />
    </>
  );
}
