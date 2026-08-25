// `<LoginForm>` — RHF + zod resolver.
// Figma: https://www.figma.com/design/3vveHWaPfPnhzITDmstmJo/SICO.AI?node-id=12890-30278
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, FieldError, FieldGroup } from "@sico/ui";
import { Loader2 } from "lucide-react";
import type { JSX } from "react";

import { AuthFormShell, type AuthModeCopy } from "./auth-form-shell";
import { AuthPrompt } from "./auth-prompt";
import { EmailField } from "./email-field";
import { PasswordField } from "./password-field";
import type { LoginMode } from "../../../components/shell/login-mode-context";
import { useLoginMode } from "../../../components/shell/login-mode-context";
import type { LoginResponse } from "../../../schemas/auth";
import { useLoginForm } from "../hooks/use-login-form";

// Re-export so the `@sico/shared` public API keeps `LoginMode` at its existing
// path (the type now lives in the shell's login-mode-context).
export type { LoginMode };

// `useLingui().t` (not the module-scope `t` macro) so the title / subtitle /
// toggle copy re-renders when the locale switches. Calling this hook subscribes
// `<LoginForm>` to Lingui.
function useModeCopy(): Record<LoginMode, AuthModeCopy> {
  const { t } = useLingui();
  return {
    operator: {
      title: t({ id: "rbacLogin.loginForm.operatorTitle", message: "Sign in" }),
      subtitle: t({
        id: "rbacLogin.loginForm.operatorSubtitle",
        message: "Your Digital Workforce Platform.",
      }),
      switchTo: t({
        id: "rbacLogin.loginForm.operatorSwitchTo",
        message: "Go to SICO.Dev",
      }),
    },
    developer: {
      title: t({
        id: "rbacLogin.loginForm.developerTitle",
        message: "Welcome to SICO.Dev",
      }),
      subtitle: t({
        id: "rbacLogin.loginForm.developerSubtitle",
        message: "Build and manage Digital Workers.",
      }),
      switchTo: t({
        id: "rbacLogin.loginForm.developerSwitchTo",
        message: "Go to SICO",
      }),
    },
  };
}

export type LoginFormProps = {
  // `mode` lets the caller route by destination (operator → workspace,
  // developer → studio).
  readonly onSuccess: (data: LoginResponse, mode: LoginMode) => void;
  readonly onRegister?: (mode: LoginMode) => void;
};

export function LoginForm({
  onSuccess,
  onRegister,
}: LoginFormProps): JSX.Element {
  const { t } = useLingui();
  const [mode, setMode] = useLoginMode();
  const copy = useModeCopy();
  const {
    control,
    onSubmit,
    isPending,
    credentialsError,
    networkError,
    triggerOnBlurIfFilled,
    clearCredentialsError,
  } = useLoginForm(mode, onSuccess);
  const hasCredentialsError = Boolean(credentialsError);

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
              hasCredentialsError={hasCredentialsError}
              triggerOnBlurIfFilled={triggerOnBlurIfFilled}
              clearCredentialsError={clearCredentialsError}
            />
            <PasswordField
              control={control}
              hasCredentialsError={hasCredentialsError}
              triggerOnBlurIfFilled={triggerOnBlurIfFilled}
              clearCredentialsError={clearCredentialsError}
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
              {isPending ? <Loader2 className="animate-spin" /> : null}
              <Trans id="rbacLogin.loginForm.continue">Continue</Trans>
            </Button>
            {credentialsError ? (
              <FieldError>{credentialsError}</FieldError>
            ) : null}
            {networkError ? <FieldError>{networkError}</FieldError> : null}
          </FieldGroup>
          {onRegister ? (
            <AuthPrompt
              question={t({
                id: "rbacLogin.loginForm.noAccount",
                message: "Don't have an account?",
              })}
              action={t({
                id: "rbacLogin.loginForm.signUp",
                message: "Sign up",
              })}
              onClick={() => onRegister(displayedMode)}
            />
          ) : null}
        </>
      )}
    </AuthFormShell>
  );
}
