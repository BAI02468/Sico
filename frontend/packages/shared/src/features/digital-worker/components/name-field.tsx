import { useLingui } from "@lingui/react/macro";
import { Field, FieldError, FieldLabel, Input } from "@sico/ui";
import type * as React from "react";
import { type Control, Controller } from "react-hook-form";

import { type AddDwValues } from "./add-dw-fields";
import { FIELD_LABEL_CLASS } from "../../../constants/form";

export function NameField({
  control,
}: {
  control: Control<AddDwValues>;
}): React.JSX.Element {
  const { t } = useLingui();
  return (
    <Controller
      name="name"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid ? true : undefined}>
          <FieldLabel htmlFor="add-dw-name" className={FIELD_LABEL_CLASS}>
            {t({ id: "digitalWorker.addDialog.nameLabel", message: "Name" })}
          </FieldLabel>
          <Input
            id="add-dw-name"
            placeholder={t({
              id: "digitalWorker.addDialog.namePlaceholder",
              message: "e.g. Nova",
            })}
            maxLength={20}
            aria-invalid={fieldState.invalid ? true : undefined}
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
