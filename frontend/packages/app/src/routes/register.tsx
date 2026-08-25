import {
  authModeSearchSchema,
  RegisterPage,
  resolveLandingPath,
} from "@sico/shared";
import { getAccessToken } from "@sico/shared/utils/auth-storage.ts";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/register")({
  validateSearch: authModeSearchSchema,
  // Pre-React guard — an already-authed visit bounces to its mode landing.
  beforeLoad: () => {
    if (getAccessToken()) {
      // oxlint-disable-next-line typescript-eslint/only-throw-error -- TanStack Router's `redirect()` is the documented control-flow signal
      throw redirect({
        to: resolveLandingPath({}, "/digital-worker"),
      });
    }
  },
  component: RegisterPage,
});
