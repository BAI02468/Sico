import { createFileRoute, redirect } from "@tanstack/react-router";

// Bare `/organization` opens the Organization members page.
export const Route = createFileRoute("/_authed/organization/")({
  beforeLoad: () => {
    // oxlint-disable-next-line typescript-eslint/only-throw-error -- TanStack Router's `redirect()` is the documented control-flow signal
    throw redirect({ to: "/organization/members" });
  },
});
