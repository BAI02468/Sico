import { useLingui } from "@lingui/react/macro";
import { Field, FieldLabel } from "@sico/ui";
import type * as React from "react";
import { type Control, Controller } from "react-hook-form";

import { type AddDwValues } from "./add-dw-fields";
import { DwAvatarPicker } from "./dw-avatar-picker";
import { FIELD_LABEL_CLASS } from "../../../constants/form";

export function AvatarField({
  control,
}: {
  control: Control<AddDwValues>;
}): React.JSX.Element {
  const { t } = useLingui();
  return (
    <Controller
      name="iconUri"
      control={control}
      render={({ field }) => (
        <Field>
          <FieldLabel className={FIELD_LABEL_CLASS}>
            {t({
              id: "digitalWorker.addDialog.avatarLabel",
              message: "Avatar",
            })}
          </FieldLabel>
          <DwAvatarPicker value={field.value} onChange={field.onChange} />
        </Field>
      )}
    />
  );
}
