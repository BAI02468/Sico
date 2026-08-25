// `<PasswordField>` — password Controller for `<LoginForm>`, with a local
// visibility toggle + Caps Lock hint.
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Field,
  FieldError,
  FieldLabel,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@sico/ui";
import { Eye, EyeOff } from "lucide-react";
import { type JSX, type KeyboardEvent, useState } from "react";
import { Controller } from "react-hook-form";

import type { CredentialFieldProps } from "./credential-field-props";

export function PasswordField({
  control,
  hasCredentialsError,
  triggerOnBlurIfFilled,
  clearCredentialsError,
  idPrefix = "login",
  passwordPlaceholder,
  passwordAutoComplete = "current-password",
}: CredentialFieldProps): JSX.Element {
  // `useLingui().t` (not the module-scope `t` macro) so the placeholder and
  // toggle labels re-render when the locale switches.
  const { t } = useLingui();
  const placeholder =
    passwordPlaceholder ??
    t({
      id: "rbacLogin.passwordField.placeholder",
      message: "Enter your password",
    });
  // Visibility toggle + Caps Lock hint are local to this field only.
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  // `onKeyUp` (not `onChange`) so the event carries `getModifierState`.
  const handlePasswordKey = (event: KeyboardEvent<HTMLInputElement>): void => {
    setCapsOn(event.getModifierState("CapsLock"));
  };
  const passwordToggleLabel = showPassword
    ? t({ id: "rbacLogin.passwordField.hide", message: "Hide password" })
    : t({ id: "rbacLogin.passwordField.show", message: "Show password" });

  return (
    <Controller
      name="password"
      control={control}
      render={({ field, fieldState }) => (
        <Field
          data-invalid={
            fieldState.invalid || hasCredentialsError ? true : undefined
          }
        >
          <FieldLabel htmlFor={`${idPrefix}-password`}>
            <Trans id="rbacLogin.passwordField.label">Password*</Trans>
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id={`${idPrefix}-password`}
              type={showPassword ? "text" : "password"}
              autoComplete={passwordAutoComplete}
              placeholder={placeholder}
              aria-invalid={
                fieldState.invalid || hasCredentialsError ? true : undefined
              }
              name={field.name}
              ref={field.ref}
              value={field.value}
              onBlur={() => {
                field.onBlur();
                triggerOnBlurIfFilled("password");
              }}
              onChange={(event) => {
                field.onChange(event);
                clearCredentialsError();
              }}
              onKeyUp={handlePasswordKey}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={passwordToggleLabel}
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" />
                ) : (
                  <Eye aria-hidden="true" />
                )}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {capsOn && (
            <p className="text-foreground-tertiary text-sm">
              <Trans id="rbacLogin.passwordField.capsLock">
                Caps Lock is on
              </Trans>
            </p>
          )}
          {fieldState.error?.message && (
            <FieldError>{fieldState.error.message}</FieldError>
          )}
        </Field>
      )}
    />
  );
}
