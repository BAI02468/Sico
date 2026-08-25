import { useMatches } from "@tanstack/react-router";
import { type JSX, type ReactNode, useRef } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { useUserOrganizationsQuery } from "../../features/organization/hooks/use-organization-query";
import { usePermissionSnapshotQuery } from "../../features/rbac/hooks/use-permission-snapshot";
import { Sidebar } from "../../features/sidebar/components/sidebar";
import { useFocusFirstHeading } from "../../hooks/use-focus-first-heading";
import "../../types/router";
import { InnerErrorFallback } from "../error-boundary/inner-error-fallback";

type AppShellProps = {
  readonly children: ReactNode;
};

/**
 * Authenticated route shell. Composes into `routes/_authed.tsx`.
 *
 * Does NOT render its own `<h1>`: if it did, `useFocusFirstHeading`
 * would always focus *that* on route change and page headings would
 * never receive focus. Contract: one `<h1>` per route, owned by the
 * page, with `tabIndex={-1}`.
 */
export function AppShell({ children }: AppShellProps): JSX.Element {
  useUserOrganizationsQuery();
  usePermissionSnapshotQuery();
  const mainRef = useRef<HTMLElement | null>(null);
  const matches = useMatches();
  const hidePrimarySidebar = matches.some(
    (match) => match.staticData.hidePrimarySidebar,
  );
  useFocusFirstHeading(mainRef);
  return (
    <div className="flex h-screen">
      {hidePrimarySidebar ? null : <Sidebar />}
      {/* Content column sits above the sidebar (z-10) and casts a leftward
          shadow onto it via `--shadow-seam` — two soft, low-opacity layers
          (0.04 / 0.03) so the seam reads as a gentle cast shadow, not a
          hairline. */}
      <div className="shadow-seam border-stroke-seam relative z-10 flex min-w-0 flex-1 flex-col border-l">
        <main ref={mainRef} className="relative flex-1 overflow-hidden">
          {/* Decorative ambient background — two blurred color-wash blobs +
              a paper-grain overlay, as three sibling layers so the washes blend
              with each other and the grain multiplies over both (matches the
              original component). Light-only (`dark:hidden`): in dark mode the
              wrapper collapses so the canvas' own dark surface shows through.
              Content lives in the `relative z-10` sibling below, so the washes
              always sit behind it. The blob + grain values Tailwind can't
              express live in the `bg-app-glow-warm` / `bg-app-glow-cool` /
              `bg-app-grain` utilities. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden dark:hidden"
          >
            <div className="bg-app-glow-warm absolute rounded-full opacity-80" />
            <div className="bg-app-glow-cool absolute rounded-full opacity-60" />
            <div className="bg-app-grain absolute inset-0 opacity-40 mix-blend-multiply" />
          </div>
          <div className="relative z-10 h-full">
            <ErrorBoundary FallbackComponent={InnerErrorFallback}>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
