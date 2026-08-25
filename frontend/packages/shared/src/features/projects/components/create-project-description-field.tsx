import { useLingui } from "@lingui/react/macro";
import { Field, FieldError, FieldLabel } from "@sico/ui";
import type * as React from "react";
import { type Control, Controller } from "react-hook-form";

import {
  type CreateProjectValues,
  MAX_DESCRIPTION_LENGTH,
} from "./create-project-fields";
import { CharCountTextarea } from "../../../components/char-count-textarea";
import { FIELD_LABEL_CLASS } from "../../../constants/form";

/** The description field for the create/edit project forms. Promoted from a
 * module render helper to a component so its copy is extracted by the lingui
 * macro and re-renders on a runtime locale switch (`useLingui` hook `t`). */
export function CreateProjectDescriptionField({
  control,
}: {
  control: Control<CreateProjectValues>;
}): React.JSX.Element {
  const { t } = useLingui();
  return (
    <Controller
      name="description"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid ? true : undefined}>
          <FieldLabel
            htmlFor="create-project-description"
            className={FIELD_LABEL_CLASS}
          >
            {t({
              id: "projects.createDialog.descriptionLabel",
              message: "Description",
            })}
          </FieldLabel>
          <CharCountTextarea
            id="create-project-description"
            placeholder={t({
              id: "projects.createDialog.descriptionPlaceholder",
              message: "What is this project trying to do? Who is it for?",
            })}
            ariaInvalid={fieldState.invalid ? true : undefined}
            max={MAX_DESCRIPTION_LENGTH}
            // Fixed height — override the base `field-sizing-content` so the
            // dialog layout stays stable; overflow scrolls internally.
            className="[field-sizing:fixed] h-30 resize-none"
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
