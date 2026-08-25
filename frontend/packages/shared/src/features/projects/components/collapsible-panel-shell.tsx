import { useLingui } from "@lingui/react/macro";
import { Button } from "@sico/ui";
import { PanelRight } from "lucide-react";
import type * as React from "react";

export type CollapsiblePanelShellProps = {
  /** Panel region name — shown as a visible header title AND the section's
   * `aria-label` so AT can tell the panels apart. */
  label: string;
  /** Collapse the panel — the page owns the state + renders a restore button. */
  onCollapse: () => void;
  /** Header actions next to the title (e.g. knowledge's `…` menu). */
  actions?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Shared chrome for a collapsible right-side panel — a static `w-80` column with
 * an `h-12` header over a scrolling body. Header layout: the title (+ optional
 * actions) cluster left, the collapse button pins right. Used by both the
 * asset-detail "Detail" panel and the project-overview drawer. Presentational:
 * it owns no collapse STATE (the page does) — it only raises `onCollapse`; the
 * page renders the restore button in its `ProjectPageHeader` `rightSlot` when
 * collapsed.
 */
export function CollapsiblePanelShell({
  label,
  onCollapse,
  actions,
  children,
}: CollapsiblePanelShellProps): React.JSX.Element {
  const { t } = useLingui();
  return (
    <section aria-label={label} className="flex h-full w-80 shrink-0 flex-col">
      <header className="flex h-12 items-center justify-between gap-1 pr-5 pl-5">
        <div className="flex min-w-0 items-center gap-1">
          <h2 className="text-foreground-primary truncate text-sm font-medium">
            {label}
          </h2>
          {actions ? (
            <div className="flex items-center gap-1">{actions}</div>
          ) : null}
        </div>
        <Button
          variant="subtle"
          size="icon-sm"
          aria-label={t({
            id: "projects.collapsiblePanelShell.collapsePanel",
            message: "Collapse panel",
          })}
          onClick={onCollapse}
        >
          <PanelRight />
        </Button>
      </header>
      <div className="scrollbar flex flex-1 flex-col gap-8 overflow-y-auto pt-8 pr-5 pb-5 pl-5">
        {children}
      </div>
    </section>
  );
}
