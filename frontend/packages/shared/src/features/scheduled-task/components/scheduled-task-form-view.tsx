import { useLingui } from "@lingui/react/macro";
import {
  Button,
  DialogFooter,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@sico/ui";
import { Loader2 } from "lucide-react";
import { type JSX } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";

import { ScheduledTaskDigitalWorkerField } from "./fields/scheduled-task-digital-worker-field";
import { ScheduledTaskEmailOnCompleteField } from "./fields/scheduled-task-email-on-complete-field";
import { ScheduledTaskInstructionField } from "./fields/scheduled-task-instruction-field";
import { ScheduledTaskNameField } from "./fields/scheduled-task-name-field";
import { ScheduledTaskScheduleFields } from "./fields/scheduled-task-schedule-fields";
import { FIELD_LABEL_CLASS } from "../../../constants/form";
import { type ScheduledTaskAttachments } from "../hooks/use-scheduled-task-attachments";
import { type ScheduledTaskFormValues } from "../schemas/scheduled-task-form";

type Props = {
  form: UseFormReturn<ScheduledTaskFormValues>;
  attachments: ScheduledTaskAttachments;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (values: ScheduledTaskFormValues) => void;
};

type ActionsProps = Pick<Props, "isSaving" | "onCancel"> & {
  cancelLabel: string;
  saveLabel: string;
  submitDisabled: boolean;
};

function renderScheduledTaskFormActions({
  cancelLabel,
  isSaving,
  onCancel,
  saveLabel,
  submitDisabled,
}: ActionsProps): JSX.Element {
  return (
    <DialogFooter className="mt-6 shrink-0">
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button type="submit" aria-busy={isSaving} disabled={submitDisabled}>
          {isSaving ? <Loader2 className="animate-spin" /> : null}
          {saveLabel}
        </Button>
      </div>
    </DialogFooter>
  );
}

export function ScheduledTaskFormView({
  form,
  attachments,
  isSaving,
  onCancel,
  onSubmit,
}: Props): JSX.Element {
  const { t } = useLingui();
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex h-full min-h-0 flex-col"
    >
      <div
        data-testid="scheduled-task-form-scroll"
        className="scrollbar min-h-0 flex-1 overflow-y-auto pe-1"
      >
        <FieldGroup className="gap-4">
          <ScheduledTaskNameField control={form.control} disabled={isSaving} />
          <Controller
            name="message"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid ? true : undefined}>
                <FieldLabel
                  htmlFor="scheduled-task-instruction"
                  className={FIELD_LABEL_CLASS}
                >
                  {t({
                    id: "scheduledTask.form.instruction.label",
                    message: "Instruction",
                  })}
                </FieldLabel>
                <ScheduledTaskInstructionField
                  message={field.value}
                  onMessageChange={field.onChange}
                  attachments={attachments.attachments}
                  onAddFile={attachments.addFile}
                  onRemoveAttachment={attachments.removeAttachment}
                  fileError={attachments.fileError}
                  id="scheduled-task-instruction"
                  invalid={fieldState.invalid}
                  required
                  disabled={isSaving}
                  actions={
                    <ScheduledTaskDigitalWorkerField
                      control={form.control}
                      disabled={isSaving}
                    />
                  }
                />
                {fieldState.error?.message ? (
                  <FieldError>{fieldState.error.message}</FieldError>
                ) : null}
              </Field>
            )}
          />
          <ScheduledTaskScheduleFields
            control={form.control}
            disabled={isSaving}
          />
          <ScheduledTaskEmailOnCompleteField
            control={form.control}
            disabled={isSaving}
          />
        </FieldGroup>
      </div>
      {renderScheduledTaskFormActions({
        cancelLabel: t({ id: "common.action.cancel", message: "Cancel" }),
        isSaving,
        onCancel,
        saveLabel: isSaving
          ? t({ id: "common.status.saving", message: "Saving…" })
          : t({ id: "common.action.save", message: "Save" }),
        submitDisabled: isSaving || attachments.anyUploading,
      })}
    </form>
  );
}
