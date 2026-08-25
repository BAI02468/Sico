import { useLingui } from "@lingui/react/macro";
import { Field, FieldError, FieldLabel, Input } from "@sico/ui";
import type * as React from "react";
import { type Control, Controller } from "react-hook-form";

import { type InviteRoleFieldValues } from "./invite-role-field";

export function InviteEmailField({
  control,
}: {
  control: Control<InviteRoleFieldValues>;
}): React.JSX.Element {
  const { t } = useLingui();
  return (
    <Controller
      name="email"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid ? true : undefined}>
          <FieldLabel
            htmlFor="invite-org-email"
            className="text-xs font-semibold tracking-wider uppercase"
          >
            {t({ id: "common.field.email", message: "Email" })}
          </FieldLabel>
          <Input
            id="invite-org-email"
            type="email"
            placeholder={t({
              id: "organization.invite.emailPlaceholder",
              message: "name@company.com",
            })}
            aria-invalid={fieldState.invalid ? true : undefined}
            name={field.name}
            ref={field.ref}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
          />
          {fieldState.error?.message ? (
            <FieldError>{fieldState.error.message}</FieldError>
          ) : null}
        </Field>
      )}
    />
  );
}
