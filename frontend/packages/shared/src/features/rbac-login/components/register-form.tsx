// `<RegisterForm>` — dual-mode registration with shared credential fields.
// Figma: https://www.figma.com/design/3vveHWaPfPnhzITDmstmJo/SICO.AI?node-id=12890-30392
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, FieldError, FieldGroup } from "@sico/ui";
import type { JSX } from "react";

import { AuthFormShell, type AuthModeCopy } from "./auth-form-shell";
import { AuthPrompt } from "./auth-prompt";
import { EmailField } from "./email-field";
import { PasswordField } from "./password-field";
import {
  type LoginMode,
  useLoginMode,
} from "../../../components/shell/login-mode-context";
import type { RegisterNewUserResponse } from "../../../schemas/auth";
import { useRegisterForm } from "../hooks/use-register-form";

// `useLingui().t` (not the module-scope `t` macro) so the title / subtitle /
// toggle copy re-renders when the locale switches. Calling this hook subscribes
// `<RegisterForm>` to Lingui.
function useModeCopy(): Record<LoginMode, AuthModeCopy> {
  const { t } = useLingui();
  return {
    operator: {
      title: t({
        id: "rbacLogin.registerForm.operatorTitle",
        message: "Sign up",
      }),
      subtitle: t({
        id: "rbacLogin.registerForm.operatorSubtitle",
        message: "Your Digital Workforce Platform.",
      }),
      switchTo: t({
        id: "rbacLogin.registerForm.operatorSwitchTo",
        message: "Go to SICO.Dev",
      }),
    },
    developer: {
      title: t({
        id: "rbacLogin.registerForm.developerTitle",
        message: "Welcome to SICO.Dev",
      }),
      subtitle: t({
        id: "rbacLogin.registerForm.developerSubtitle",
        message: "Build and manage Digital Workers.",
      }),
      switchTo: t({
        id: "rbacLogin.registerForm.developerSwitchTo",
        message: "Go to SICO",
      }),
    },
  };
}

export type RegisterFormProps = {
  readonly onSuccess: (data: RegisterNewUserResponse, mode: LoginMode) => void;
  readonly onLogin: (mode: LoginMode) => void;
};

export function RegisterForm({
  onSuccess,
  onLogin,
}: RegisterFormProps): JSX.Element {
  const { t } = useLingui();
  const [mode, setMode] = useLoginMode();
  const copy = useModeCopy();
  const {
    control,
    onSubmit,
    isPending,
    registrationError,
    networkError,
    triggerOnBlurIfFilled,
    clearFormErrors,
  } = useRegisterForm(mode, onSuccess);

  return (
    <AuthFormShell
      copy={copy}
      mode={mode}
      setMode={setMode}
      onSubmit={onSubmit}
    >
      {(displayedMode) => (
        <>
          <FieldGroup
            className="motion-safe:animate-login-entrance gap-8"
            style={{ animationDelay: "170ms" }}
          >
            <EmailField
              control={control}
              hasCredentialsError={Boolean(registrationError)}
              triggerOnBlurIfFilled={triggerOnBlurIfFilled}
              clearCredentialsError={clearFormErrors}
              idPrefix="register"
            />
            <PasswordField
              control={control}
              hasCredentialsError={Boolean(registrationError)}
              triggerOnBlurIfFilled={triggerOnBlurIfFilled}
              clearCredentialsError={clearFormErrors}
              idPrefix="register"
              passwordPlaceholder={t({
                id: "rbacLogin.registerForm.passwordPlaceholder",
                message: "Create password",
              })}
              passwordAutoComplete="new-password"
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="motion-safe:animate-login-entrance w-full"
              style={{ animationDelay: "230ms" }}
              disabled={isPending}
              aria-busy={isPending}
            >
              <Trans id="rbacLogin.registerForm.createAccount">
                Create Account
              </Trans>
            </Button>
            {registrationError ? (
              <FieldError>{registrationError}</FieldError>
            ) : null}
            {networkError ? <FieldError>{networkError}</FieldError> : null}
          </FieldGroup>
          <AuthPrompt
            question={t({
              id: "rbacLogin.registerForm.haveAccount",
              message: "Already have an account?",
            })}
            action={t({
              id: "rbacLogin.registerForm.signIn",
              message: "Sign in",
            })}
            onClick={() => onLogin(displayedMode)}
          />
        </>
      )}
    </AuthFormShell>
  );
}
