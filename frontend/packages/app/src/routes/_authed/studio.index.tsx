import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/studio/")({
  beforeLoad: () => {
    // oxlint-disable-next-line typescript-eslint/only-throw-error -- TanStack Router's `redirect()` is the documented control-flow signal
    throw redirect({ to: "/studio/all" });
  },
});
