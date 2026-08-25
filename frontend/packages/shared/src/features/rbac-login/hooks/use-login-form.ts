import { zodResolver } from "@hookform/resolvers/zod";
import { useLingui } from "@lingui/react/macro";
import type { BaseSyntheticEvent } from "react";
import { useEffect, useRef } from "react";
import { type Control, useForm, type UseFormReturn } from "react-hook-form";

import { useLogin } from "./use-login";
import type { LoginMode } from "../../../components/shell/login-mode-context";
import type { LoginResponse } from "../../../schemas/auth";
import { useSicoConfig } from "../../../services/sico-config-context";
import { loginFormSchema, type LoginFormValues } from "../schemas/login-form";

type UseLoginFormResult = {
  readonly control: Control<LoginFormValues>;
  readonly onSubmit: (e?: BaseSyntheticEvent) => Promise<void>;
  readonly isPending: boolean;
  readonly credentialsError: string | undefined;
  readonly networkError: string | undefined;
  readonly triggerOnBlurIfFilled: (name: keyof LoginFormValues) => void;
  readonly clearCredentialsError: () => void;
};

// RHF stores resolved error messages in form state, so a locale switch doesn't
// retranslate errors already on screen. Re-validate the zod-driven fields that
// currently show an error (only those — don't surface new ones) so their
// messages swap to the rebuilt, localized resolver. The credentials/network
// errors are set manually via `setError` (not the resolver), so re-set those
// too with freshly localized copy when they're currently shown.
function useRelocalizeErrors(
  form: UseFormReturn<LoginFormValues>,
  copy: { credentials: string; network: string },
): void {
  const { i18n } = useLingui();
  useEffect(() => {
    const { errors } = form.formState;
    const errored = (["email", "password"] as const).filter(
      (field) => errors[field],
    );
    if (errored.length > 0) {
      void form.trigger(errored);
    }
    if (errors.root?.credentials) {
      form.setError("root.credentials", { message: copy.credentials });
    }
    if (errors.root?.network) {
      form.setError("root.network", { message: copy.network });
    }
    // `copy` is derived from `i18n.locale`, so listing the locale is enough;
    // re-running on `copy` identity would loop as setError re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.locale, form]);
}

// Fixed client-side copy for the two backend-message-less failures. Built with
// the reactive `useLingui().t` so a locale switch retranslates them.
function useErrorCopy(): { credentials: string; network: string } {
  const { t } = useLingui();
  return {
    credentials: t({
      id: "rbacLogin.loginForm.credentialsError",
      message: "Incorrect email or password. Please try again.",
    }),
    network: t({
      id: "rbacLogin.loginForm.networkError",
      message:
        "Couldn't reach the server. Please check your connection and try again.",
    }),
  };
}

// All of `<LoginForm>`'s form wiring: RHF + zod resolver, the credentials /
// network error split from `useLogin`, and the submit-time `mode` snapshot so
// `onSuccess` routes by the mode the user actually submitted under (not one
// toggled while the request is in flight). Keeps `<LoginForm>` to a hook call
// + JSX.
export function useLoginForm(
  mode: LoginMode,
  onSuccess: (data: LoginResponse, mode: LoginMode) => void,
): UseLoginFormResult {
  const { loginPrefillCredentials } = useSicoConfig();
  const errorCopy = useErrorCopy();
  // Errors already on screen don't retranslate on their own (RHF stores the
  // resolved string); `useRelocalizeErrors` below re-validates the errored
  // fields on a locale switch so the zod `error` callback re-runs in the new
  // locale.
  const form = useForm<LoginFormValues>({
    // Module-scope schema: zod v4's `error` callback resolves each message via
    // `i18n._()` at validation time, so it always reflects the active locale
    // without rebuilding the schema per render.
    resolver: zodResolver(loginFormSchema),
    // Seed account for local dev; kept in sync with e2e + qa.md +
    // docs/infra/local-backend.md. Gated by SicoConfig so downstream apps
    // (dwp) can ship an empty form instead.
    defaultValues: loginPrefillCredentials
      ? { email: "operator@sico.local", password: "operator" }
      : { email: "", password: "" },
    // `onSubmit` mode + per-field blur-with-content guard below: empty
    // blurs stay quiet, non-empty invalid blurs surface zod inline.
    // `onChange` re-validation clears the error on the next valid keystroke.
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  // react-query rebuilds `onSuccess` from the latest render, so reading `mode`
  // there reports its value at resolution time. A user can toggle mode while
  // the request is in flight; snapshot the submitted mode in a ref so
  // `onSuccess` routes by what the user actually submitted under.
  const submittedModeRef = useRef<LoginMode>(mode);

  const login = useLogin({
    onSuccess: (data) => onSuccess(data, submittedModeRef.current),
    onCredentialsError: () =>
      form.setError("root.credentials", { message: errorCopy.credentials }),
    onNetworkError: () =>
      form.setError("root.network", { message: errorCopy.network }),
  });

  // Backend doesn't tell us which credential was wrong, so editing
  // either field clears the shared error.
  const clearCredentialsError = (): void => {
    if (form.formState.errors.root?.credentials) {
      form.clearErrors("root.credentials");
    }
  };

  // Blur trigger guarded so empty fields stay quiet (see RHF config above).
  const triggerOnBlurIfFilled = (name: keyof LoginFormValues): void => {
    if (form.getValues(name)) {
      void form.trigger(name);
    }
  };
  useRelocalizeErrors(form, errorCopy);

  const onSubmit = form.handleSubmit((values) => {
    submittedModeRef.current = mode;
    login.mutate(values);
  });

  return {
    control: form.control,
    onSubmit,
    isPending: login.isPending,
    credentialsError: form.formState.errors.root?.credentials?.message,
    networkError: form.formState.errors.root?.network?.message,
    triggerOnBlurIfFilled,
    clearCredentialsError,
  };
}
