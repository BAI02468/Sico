// `<LoginPage>` — the login route's component, extracted from the route so the
// route file stays a thin scaffold. Owns the 401-bounce toast, mode-switch
// navigation, and success landing; DWP mounts it through its own /login route.
import { useLingui } from "@lingui/react/macro";
import { toast } from "@sico/ui";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect } from "react";

import { LoginForm } from "./login-form";
import { LoginLayout } from "../../../components/shell/login-layout";
import { HTTP_UNAUTHORIZED } from "../../../constants/http";
import { resolveLandingPath } from "../../../utils/resolve-landing-path";
import { modeFromSearch, searchForMode } from "../schemas/auth-mode";
import type { LoginSearch } from "../schemas/login-search";

export function LoginPage(): JSX.Element {
  const { t } = useLingui();
  // `useSearch`/`useNavigate` return `any` outside the app's route-type
  // registry (shared has no route augmentation). The route's `validateSearch`
  // already guarantees the shape at runtime, so annotate at this boundary.
  const search: LoginSearch = useSearch({ from: "/login" });
  const navigate = useNavigate({ from: "/login" });
  const mode = modeFromSearch(search);
  // `beforeLoad` runs outside React, so the 401-bounce toast lives here.
  // Stripping `?code` after first render keeps refresh / back nav quiet.
  // Stable `id` lets sonner dedupe StrictMode's double-invoke.
  useEffect(() => {
    if (search.code === HTTP_UNAUTHORIZED) {
      toast.error(
        t({
          id: "login.sessionExpired",
          message: "Your session has expired. Please sign in again.",
        }),
        {
          id: "session-expired",
        },
      );
      void navigate({
        search: (previous: LoginSearch) => ({ ...previous, code: undefined }),
        replace: true,
      });
    }
    // `t` is intentionally omitted: the 401 toast fires once on `search.code`,
    // and re-running on a locale switch would re-toast an already-handled bounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.code, navigate]);

  return (
    <LoginLayout
      mode={mode}
      onModeChange={(nextMode) => {
        void navigate({
          search: (previous: LoginSearch) => ({
            ...previous,
            mode: searchForMode(nextMode).mode,
          }),
        });
      }}
    >
      <LoginForm
        onRegister={(registrationMode) => {
          void navigate({
            to: "/register",
            search: searchForMode(registrationMode),
          });
        }}
        onSuccess={(_data, submittedMode) => {
          // The submitted face selects this login's landing route. `next`
          // (401 bounce) still wins via `resolveLandingPath`.
          void navigate({
            to: resolveLandingPath(
              search,
              submittedMode === "developer" ? "/studio/all" : "/digital-worker",
            ),
            replace: true,
          });
        }}
      />
    </LoginLayout>
  );
}
