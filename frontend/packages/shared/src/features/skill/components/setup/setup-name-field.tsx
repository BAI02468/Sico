import { useLingui } from "@lingui/react/macro";
import { Field, FieldError, FieldLabel, Input } from "@sico/ui";
import { type ReactElement } from "react";
import { type Control, Controller } from "react-hook-form";

import { type SetupBasicInfoValues } from "./setup-basic-info-values";

export function SetupNameField({
  control,
  disabled,
  placeholder,
}: {
  control: Control<SetupBasicInfoValues>;
  disabled: boolean;
  placeholder?: string;
}): ReactElement {
  const { t } = useLingui();
  return (
    <Controller
      name="name"
      control={control}
      render={({ field, fieldState }) => (
        <Field
          className="flex-1"
          data-invalid={fieldState.invalid || undefined}
        >
          <FieldLabel htmlFor="setup-name">
            {t({
              id: "skill.setupBasicInfo.originalName",
              message: "Role Name",
            })}
            <span aria-hidden="true">*</span>
          </FieldLabel>
          <Input
            id="setup-name"
            placeholder={
              placeholder ??
              t({
                id: "skill.setupBasicInfo.namePlaceholder",
                message: "e.g. Ryan",
              })
            }
            aria-invalid={fieldState.invalid || undefined}
            required
            disabled={disabled}
            name={field.name}
            ref={field.ref}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
          />
          {fieldState.error?.message && (
            <FieldError>{fieldState.error.message}</FieldError>
          )}
        </Field>
      )}
    />
  );
}
