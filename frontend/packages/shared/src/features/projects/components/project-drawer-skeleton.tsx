import { Skeleton } from "@sico/ui";
import type * as React from "react";

import { DrawerKnowledgeSkeleton } from "./drawer-knowledge-skeleton";
import { DrawerSandboxSkeleton } from "./drawer-sandbox-skeleton";
import { DrawerTeamSkeleton } from "./drawer-team-skeleton";

const DIVIDER = <hr className="border-divider w-full border-t border-solid" />;

/**
 * Content-shaped loading surface for {@link ProjectDrawer}: a `Skeleton` mirror
 * of the drawer's meta / Team / Sandbox / Knowledge-tags shape — never a
 * spinner — so the panel does not reflow when the real queries resolve. Traces
 * the drawer's actual chrome: borderless `w-80`, titled header with the collapse
 * control pinned right, and a locally scrolling `px-5 py-* gap-8` body. Each
 * section reuses the same per-section skeleton the drawer's self-fetching
 * sections fall back to
 * ({@link DrawerTeamSkeleton} etc.), so the two never drift. A building block:
 * the whole section is `aria-hidden` with no `role="status"` — its only consumer
 * (`ProjectWorkspaceSkeleton`) owns the single live region.
 */
export function ProjectDrawerSkeleton(): React.JSX.Element {
  return (
    <section
      aria-hidden="true"
      data-testid="project-drawer-skeleton"
      className="flex h-full w-80 shrink-0 flex-col"
    >
      <div
        data-testid="project-drawer-skeleton-header"
        className="flex h-12 items-center justify-between gap-1 pr-5 pl-5"
      >
        <div
          data-testid="project-drawer-skeleton-title"
          className="flex min-w-0 items-center gap-1"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton
            data-testid="project-drawer-skeleton-action"
            className="size-7"
          />
        </div>
        <Skeleton
          data-testid="project-drawer-skeleton-collapse"
          className="size-7"
        />
      </div>
      <div
        data-testid="project-drawer-skeleton-body"
        className="scrollbar flex flex-1 flex-col gap-8 overflow-y-auto pt-8 pr-5 pb-5 pl-5"
      >
        {/* Meta: avatar/action row, then name + description. */}
        <div className="flex flex-col gap-2">
          <div
            data-testid="project-drawer-skeleton-meta-row"
            className="flex items-start justify-between gap-1"
          >
            <Skeleton className="size-12 rounded-lg" />
            <Skeleton className="size-7" />
          </div>
          <div
            data-testid="project-drawer-skeleton-meta-copy"
            className="flex min-w-0 flex-col gap-0.5"
          >
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3.5 w-full" />
          </div>
        </div>
        <DrawerTeamSkeleton />
        {DIVIDER}
        <DrawerSandboxSkeleton />
        {DIVIDER}
        <DrawerKnowledgeSkeleton />
      </div>
    </section>
  );
}
