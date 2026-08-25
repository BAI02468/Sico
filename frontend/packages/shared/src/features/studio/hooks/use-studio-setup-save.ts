import { useLingui } from "@lingui/react/macro";
import { toast } from "@sico/ui";
import { useCallback, useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import {
  type StudioSaveAllResult,
  useStudioSaveAll,
} from "./use-studio-save-all";
import type { SetupBasicInfoValues } from "../../skill/components/setup/setup-basic-info-values";
import type { SkillSaveTarget } from "../../skill/components/setup/skill-save-registry";

type SetupSaveOptions = {
  form: UseFormReturn<SetupBasicInfoValues>;
  dirtyTargets: SkillSaveTarget[];
  onPublish?: () => void;
  saveAll: ReturnType<typeof useStudioSaveAll>["saveAll"];
};

function useStudioSaveToast(): {
  show: (result: StudioSaveAllResult) => boolean;
  showFailure: () => void;
} {
  const { t } = useLingui();
  const showFailure = useCallback(() => {
    toast.error(
      t({
        id: "studio.setupEditor.saveFailed",
        message: "Failed to save changes.",
      }),
    );
  }, [t]);
  const show = useCallback(
    (result: StudioSaveAllResult): boolean => {
      if (result.failed.length > 0) {
        toast.error(
          t({
            id: "studio.setupEditor.savePartiallyFailed",
            message: "Some changes could not be saved.",
          }),
        );
        return false;
      }
      if (result.basicSaved || result.succeeded.length > 0) {
        toast.success(
          t({
            id: "studio.setupEditor.savedSuccessfully",
            message: "Saved successfully!",
          }),
          { invert: true },
        );
      }
      return true;
    },
    [t],
  );
  return { show, showFailure };
}

export function useStudioSetupSave({
  form,
  dirtyTargets,
  onPublish,
  saveAll,
}: SetupSaveOptions): {
  submit: ReturnType<UseFormReturn<SetupBasicInfoValues>["handleSubmit"]>;
  publish: ReturnType<UseFormReturn<SetupBasicInfoValues>["handleSubmit"]>;
  isSaving: boolean;
} {
  const [isSaving, setIsSaving] = useState(false);
  const { show, showFailure } = useStudioSaveToast();
  const persist = useCallback(
    async (values: SetupBasicInfoValues, openPublishAfterSave: boolean) => {
      setIsSaving(true);
      try {
        const result = await saveAll({
          values,
          basicDirty: form.formState.isDirty,
          targets: dirtyTargets,
          openPublishAfterSave,
        });
        if (result.basicSaved) {
          form.reset(values);
        }
        const saved = show(result);
        if (openPublishAfterSave && saved && !result.created) {
          onPublish?.();
        }
      } catch {
        showFailure();
      } finally {
        setIsSaving(false);
      }
    },
    [dirtyTargets, form, onPublish, saveAll, show, showFailure],
  );

  return {
    submit: form.handleSubmit((values) => persist(values, false)),
    publish: form.handleSubmit((values) => persist(values, true)),
    isSaving,
  };
}
