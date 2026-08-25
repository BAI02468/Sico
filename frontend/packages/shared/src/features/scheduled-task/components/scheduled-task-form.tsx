import { zodResolver } from "@hookform/resolvers/zod";
import { useLingui } from "@lingui/react/macro";
import { toast } from "@sico/ui";
import { type JSX, useCallback, useEffect, useMemo, useRef } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";

import { ScheduledTaskFormView } from "./scheduled-task-form-view";
import { apiErrorMessage } from "../../../utils/api-error-message";
import {
  type ScheduledTaskAttachments,
  useScheduledTaskAttachments,
} from "../hooks/use-scheduled-task-attachments";
import {
  useCreateScheduledTaskMutation,
  useUpdateScheduledTaskMutation,
} from "../hooks/use-scheduled-task-mutations";
import { type ScheduledTask } from "../schemas/scheduled-task";
import {
  scheduledTaskFormSchema,
  type ScheduledTaskFormValues,
} from "../schemas/scheduled-task-form";
import {
  createScheduledTaskDefaults,
  editScheduledTaskDefaults,
  scheduledTaskFormToCreateInput,
  scheduledTaskFormToUpdateInput,
} from "../utils/scheduled-task-form-values";

type TaskDefaultsResetOptions = {
  attachments: ScheduledTaskAttachments;
  defaults: ScheduledTaskFormValues;
  form: UseFormReturn<ScheduledTaskFormValues>;
  resetAttachmentSync: () => void;
  taskId: number | undefined;
};

type AttachmentSync = {
  reset: () => void;
  sync: (attachments: ScheduledTaskFormValues["attachments"]) => void;
};

function useAttachmentSync(
  form: UseFormReturn<ScheduledTaskFormValues>,
): AttachmentSync {
  const hasSynced = useRef(false);
  const sync = useCallback(
    (attachments: ScheduledTaskFormValues["attachments"]) => {
      form.setValue("attachments", attachments, {
        shouldDirty: hasSynced.current,
      });
      hasSynced.current = true;
    },
    [form],
  );
  const reset = useCallback(() => {
    hasSynced.current = false;
  }, []);
  return { reset, sync };
}

function useTaskDefaultsReset({
  attachments,
  defaults,
  form,
  resetAttachmentSync,
  taskId,
}: TaskDefaultsResetOptions): void {
  const previousTaskId = useRef(taskId);
  useEffect(() => {
    if (previousTaskId.current === taskId) {
      return;
    }
    previousTaskId.current = taskId;
    resetAttachmentSync();
    form.reset(defaults);
    attachments.reset(defaults.attachments);
  }, [attachments, defaults, form, resetAttachmentSync, taskId]);
}

function withReadyAttachments(
  values: ScheduledTaskFormValues,
  attachments: ScheduledTaskAttachments,
): ScheduledTaskFormValues {
  return { ...values, attachments: attachments.readyAttachments };
}

function useDirtyReport(
  isDirty: boolean,
  onDirtyChange?: (isDirty: boolean) => void,
): void {
  useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);
}

export type ScheduledTaskFormProps = {
  task?: ScheduledTask;
  onCancel: () => void;
  onSuccess: (task: ScheduledTask) => void;
  onDirtyChange?: (isDirty: boolean) => void;
};

export function ScheduledTaskForm({
  task,
  onCancel,
  onSuccess,
  onDirtyChange,
}: ScheduledTaskFormProps): JSX.Element {
  const { t } = useLingui();
  const defaults = useMemo(
    () =>
      task ? editScheduledTaskDefaults(task) : createScheduledTaskDefaults(),
    [task],
  );
  const form = useForm<ScheduledTaskFormValues>({
    resolver: zodResolver(scheduledTaskFormSchema),
    defaultValues: defaults,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { reset: resetAttachmentSync, sync: syncAttachments } =
    useAttachmentSync(form);
  const attachments = useScheduledTaskAttachments({
    initialAttachments: defaults.attachments,
    onReadyAttachmentsChange: syncAttachments,
  });
  useTaskDefaultsReset({
    attachments,
    defaults,
    form,
    resetAttachmentSync,
    taskId: task?.id,
  });
  const createMutation = useCreateScheduledTaskMutation();
  const updateMutation = useUpdateScheduledTaskMutation();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const isDirty = form.formState.isDirty || attachments.anyUploading;
  useDirtyReport(isDirty, onDirtyChange);

  const onSubmit = (values: ScheduledTaskFormValues): void => {
    const submissionValues = withReadyAttachments(values, attachments);
    if (task) {
      updateMutation.mutate(
        scheduledTaskFormToUpdateInput(task.id, submissionValues),
        {
          onSuccess: (savedTask) => {
            toast.success(
              t({
                id: "scheduledTask.form.updateSuccess",
                message: "Scheduled task updated.",
              }),
            );
            onSuccess(savedTask);
          },
          onError: (error) =>
            toast.error(
              apiErrorMessage(
                error,
                t({
                  id: "scheduledTask.form.updateFailed",
                  message: "Couldn't update scheduled task.",
                }),
              ),
            ),
        },
      );
      return;
    }
    createMutation.mutate(scheduledTaskFormToCreateInput(submissionValues), {
      onSuccess: (savedTask) => {
        toast.success(
          t({
            id: "scheduledTask.form.createSuccess",
            message: "Scheduled task created.",
          }),
        );
        onSuccess(savedTask);
      },
      onError: (error) =>
        toast.error(
          apiErrorMessage(
            error,
            t({
              id: "scheduledTask.form.createFailed",
              message: "Couldn't create scheduled task.",
            }),
          ),
        ),
    });
  };

  return (
    <ScheduledTaskFormView
      form={form}
      attachments={attachments}
      isSaving={isSaving}
      onCancel={onCancel}
      onSubmit={onSubmit}
    />
  );
}
