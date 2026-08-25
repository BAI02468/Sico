import { useLingui } from "@lingui/react/macro";
import { Field, FieldError, FieldLabel, Input } from "@sico/ui";
import { type JSX } from "react";
import { type Control, Controller } from "react-hook-form";

import { FIELD_LABEL_CLASS } from "../../../../constants/form";
import { type ScheduledTaskFormValues } from "../../schemas/scheduled-task-form";

type Props = {
  control: Control<ScheduledTaskFormValues>;
  disabled: boolean;
};

export function ScheduledTaskNameField({
  control,
  disabled,
}: Props): JSX.Element {
  const { t } = useLingui();
  return (
    <Controller
      name="name"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid ? true : undefined}>
          <FieldLabel
            htmlFor="scheduled-task-name"
            className={FIELD_LABEL_CLASS}
          >
            {t({ id: "scheduledTask.form.name.label", message: "Task name" })}
          </FieldLabel>
          <Input
            id="scheduled-task-name"
            name={field.name}
            ref={field.ref}
            value={field.value}
            onBlur={field.onBlur}
            onChange={field.onChange}
            required
            disabled={disabled}
            aria-invalid={fieldState.invalid ? true : undefined}
            placeholder={t({
              id: "scheduledTask.form.name.placeholder",
              message: "Name this task",
            })}
          />
          {fieldState.error?.message ? (
            <FieldError>{fieldState.error.message}</FieldError>
          ) : null}
        </Field>
      )}
    />
  );
}
