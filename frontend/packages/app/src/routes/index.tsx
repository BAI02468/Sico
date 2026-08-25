import { createFileRoute, redirect } from "@tanstack/react-router";

// The landing page is a standalone static site under `public/landing/`, outside
// the SPA. `reloadDocument` makes this a full browser navigation rather than an
// in-router transition, and throwing aborts the match so nothing renders first.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // oxlint-disable-next-line typescript-eslint/only-throw-error -- TanStack Router's `redirect()` is the documented control-flow signal
    throw redirect({
      href: "/landing/index.html",
      reloadDocument: true,
      replace: true,
    });
  },
});
