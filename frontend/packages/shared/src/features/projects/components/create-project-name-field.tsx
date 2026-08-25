import { useLingui } from "@lingui/react/macro";
import { Field, FieldError, FieldLabel, Input } from "@sico/ui";
import type * as React from "react";
import { type Control, Controller } from "react-hook-form";

import {
  type CreateProjectValues,
  MAX_NAME_LENGTH,
} from "./create-project-fields";
import { FIELD_LABEL_CLASS } from "../../../constants/form";

/** The name field for the create/edit project forms. Promoted from a module
 * render helper to a component so its copy is extracted by the lingui macro and
 * re-renders on a runtime locale switch (`useLingui` hook `t`). */
export function CreateProjectNameField({
  control,
}: {
  control: Control<CreateProjectValues>;
}): React.JSX.Element {
  const { t } = useLingui();
  return (
    <Controller
      name="name"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid ? true : undefined}>
          <FieldLabel
            htmlFor="create-project-name"
            className={FIELD_LABEL_CLASS}
          >
            {t({ id: "projects.createDialog.nameLabel", message: "Name" })}
          </FieldLabel>
          <Input
            id="create-project-name"
            placeholder={t({
              id: "projects.createDialog.namePlaceholder",
              message: "e.g. Aurora launch",
            })}
            maxLength={MAX_NAME_LENGTH}
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
