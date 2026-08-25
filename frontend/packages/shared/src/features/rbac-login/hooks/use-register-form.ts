import { zodResolver } from "@hookform/resolvers/zod";
import { useLingui } from "@lingui/react/macro";
import type { BaseSyntheticEvent } from "react";
import { useEffect, useRef } from "react";
import { type Control, useForm, type UseFormReturn } from "react-hook-form";

import { useRegister } from "./use-register";
import type { LoginMode } from "../../../components/shell/login-mode-context";
import type { RegisterNewUserResponse } from "../../../schemas/auth";
import {
  registerFormSchema,
  type RegisterFormValues,
} from "../schemas/register-form";

type UseRegisterFormResult = {
  readonly control: Control<RegisterFormValues>;
  readonly onSubmit: (event?: BaseSyntheticEvent) => Promise<void>;
  readonly isPending: boolean;
  readonly registrationError: string | undefined;
  readonly networkError: string | undefined;
  readonly triggerOnBlurIfFilled: (name: keyof RegisterFormValues) => void;
  readonly clearFormErrors: () => void;
};

// Fixed client-side copy for the backend-message-less network failure. Built
// with the reactive `useLingui().t` so a locale switch retranslates it.
function useNetworkErrorCopy(): string {
  const { t } = useLingui();
  return t({
    id: "rbacLogin.registerForm.networkError",
    message:
      "Couldn't reach the server. Please check your connection and try again.",
  });
}

// RHF stores resolved error messages in form state, so a locale switch doesn't
// retranslate errors already on screen. Re-validate the zod-driven fields that
// currently show an error (only those) so their messages swap to the rebuilt,
// localized resolver. The network error is set manually via `setError` (not the
// resolver), so re-set it too with freshly localized copy when it's shown.
function useRelocalizeErrors(
  form: UseFormReturn<RegisterFormValues>,
  networkCopy: string,
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
    if (errors.root?.network) {
      form.setError("root.network", { message: networkCopy });
    }
    // `networkCopy` is derived from `i18n.locale`, so listing the locale is
    // enough; re-running on `networkCopy` identity would loop as setError
    // re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.locale, form]);
}

export function useRegisterForm(
  mode: LoginMode,
  onSuccess: (data: RegisterNewUserResponse, mode: LoginMode) => void,
): UseRegisterFormResult {
  const networkErrorCopy = useNetworkErrorCopy();
  // Errors already on screen don't retranslate on their own (RHF stores the
  // resolved string); `useRelocalizeErrors` below re-validates the errored
  // fields on a locale switch so the zod `error` callback re-runs in the new
  // locale.
  const form = useForm<RegisterFormValues>({
    // Module-scope schema: zod v4's `error` callback resolves each message via
    // `i18n._()` at validation time, so it always reflects the active locale
    // without rebuilding the schema per render.
    resolver: zodResolver(registerFormSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const submittedModeRef = useRef<LoginMode>(mode);

  const registration = useRegister({
    onSuccess: (data) => onSuccess(data, submittedModeRef.current),
    onRejectedError: () =>
      form.setError("root.registration", {
        message:
          "We couldn't create your account. Check your details and try again.",
      }),
    onNetworkError: () =>
      form.setError("root.network", {
        message: networkErrorCopy,
      }),
  });

  // Clears BOTH root errors (registration + network) — any credential edit
  // signals the user is correcting, so neither form-level error should linger.
  const clearFormErrors = (): void => {
    if (form.formState.errors.root) {
      form.clearErrors("root");
    }
  };

  const triggerOnBlurIfFilled = (name: keyof RegisterFormValues): void => {
    if (form.getValues(name)) {
      void form.trigger(name);
    }
  };
  useRelocalizeErrors(form, networkErrorCopy);

  const onSubmit = form.handleSubmit((values) => {
    submittedModeRef.current = mode;
    registration.mutate(values);
  });

  return {
    control: form.control,
    onSubmit,
    isPending: registration.isPending,
    registrationError: form.formState.errors.root?.registration?.message,
    networkError: form.formState.errors.root?.network?.message,
    triggerOnBlurIfFilled,
    clearFormErrors,
  };
}
