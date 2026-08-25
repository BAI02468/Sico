// `<EmailField>` — email Controller for `<LoginForm>`.
import { Trans, useLingui } from "@lingui/react/macro";
import { Field, FieldError, FieldLabel, Input } from "@sico/ui";
import type { JSX } from "react";
import { Controller } from "react-hook-form";

import type { CredentialFieldProps } from "./credential-field-props";

export function EmailField({
  control,
  hasCredentialsError,
  triggerOnBlurIfFilled,
  clearCredentialsError,
  idPrefix = "login",
  emailPlaceholder,
}: CredentialFieldProps): JSX.Element {
  // `useLingui().t` (not the module-scope `t` macro) so the placeholder
  // re-renders when the locale switches.
  const { t } = useLingui();
  const placeholder =
    emailPlaceholder ??
    t({
      id: "rbacLogin.emailField.placeholderYourEmail",
      message: "Enter your email address",
    });
  return (
    <Controller
      name="email"
      control={control}
      render={({ field, fieldState }) => (
        <Field
          data-invalid={
            fieldState.invalid || hasCredentialsError ? true : undefined
          }
        >
          <FieldLabel htmlFor={`${idPrefix}-email`}>
            <Trans id="rbacLogin.emailField.label">Email Address*</Trans>
          </FieldLabel>
          <Input
            id={`${idPrefix}-email`}
            type="email"
            autoComplete="username"
            placeholder={placeholder}
            aria-invalid={
              fieldState.invalid || hasCredentialsError ? true : undefined
            }
            name={field.name}
            ref={field.ref}
            value={field.value}
            onBlur={() => {
              field.onBlur();
              triggerOnBlurIfFilled("email");
            }}
            onChange={(event) => {
              field.onChange(event);
              clearCredentialsError();
            }}
          />
          {fieldState.error?.message && (
            <FieldError>{fieldState.error.message}</FieldError>
          )}
        </Field>
      )}
    />
  );
}
