import { useLingui } from "@lingui/react/macro";
import { Checkbox, Field, FieldLabel } from "@sico/ui";
import { type JSX } from "react";
import { type Control, Controller } from "react-hook-form";

import { FIELD_LABEL_CLASS } from "../../../../constants/form";
import { type ScheduledTaskFormValues } from "../../schemas/scheduled-task-form";

const FIELD_ID = "scheduled-task-email-on-complete";

type Props = {
  control: Control<ScheduledTaskFormValues>;
  disabled: boolean;
};

export function ScheduledTaskEmailOnCompleteField({
  control,
  disabled,
}: Props): JSX.Element {
  const { t } = useLingui();
  const emailLabel = t({
    id: "scheduledTask.form.emailOnComplete.label",
    message: "Notify me by email when completed",
  });
  return (
    <section className="flex flex-col gap-2">
      <h3 className={FIELD_LABEL_CLASS}>
        {t({
          id: "scheduledTask.form.advancedSettings.heading",
          message: "Advanced settings",
        })}
      </h3>
      <Controller
        name="sendEmailOnComplete"
        control={control}
        render={({ field }) => (
          <Field
            orientation="horizontal"
            className="w-fit gap-2"
            data-disabled={disabled ? true : undefined}
          >
            <Checkbox
              id={FIELD_ID}
              name={field.name}
              ref={field.ref}
              checked={field.value}
              onBlur={field.onBlur}
              onCheckedChange={field.onChange}
              disabled={disabled}
            />
            <FieldLabel htmlFor={FIELD_ID} className="font-normal">
              {emailLabel}
            </FieldLabel>
          </Field>
        )}
      />
    </section>
  );
}
