import { useLingui } from "@lingui/react/macro";
import { Button, TableCell, TableRow } from "@sico/ui";
import { cn } from "@sico/ui/lib/utils.ts";
import { Info, X } from "lucide-react";
import type * as React from "react";

import { PIN_RIGHT } from "./pinned-columns";
import { type HintTab } from "../hooks/use-dismissed-hints";

export type AssetsHintRowProps = {
  hintTab: HintTab;
  onDismissHint: (tab: HintTab) => void;
  /** Full column span of the parent table, so the content cell spans every
   *  non-actions column. */
  colSpan: number;
};

// The full-width definition-hint bar (Figma `message bar`), rendered as the
// first body row under the column headers: a leading Info glyph + bold label +
// regular description + a dismiss button. Only the two derived tabs reach here
// (resolveHintTab gates it). A component (not a render helper) so its
// `useLingui()` copy re-renders on a runtime locale switch and lingui can
// statically extract the messages.
export function AssetsHintRow({
  hintTab,
  onDismissHint,
  colSpan,
}: AssetsHintRowProps): React.JSX.Element {
  const { t } = useLingui();
  // Two-part copy (Figma `message bar`, nodes 19475-21695 / 19398-79716): a
  // bold label + a regular description.
  const copy: Record<HintTab, { label: string; description: string }> = {
    deliverable: {
      label: t({
        id: "projects.hints.deliverable.label",
        message: "Deliverable:",
      }),
      description: t({
        id: "projects.hints.deliverable.description",
        message: "Artifacts produced by digital workers.",
      }),
    },
    experience: {
      label: t({
        id: "projects.hints.experience.label",
        message: "Experience:",
      }),
      description: t({
        id: "projects.hints.experience.description",
        message: "Reusable patterns accumulated through execution.",
      }),
    },
  };
  const { label, description } = copy[hintTab];
  return (
    // The sunken tint lives on the ROW (an opaque resting fill), so the
    // pinned dismiss cell — whose `PIN_RIGHT` carries `bg-inherit` — adopts the
    // same fill as the content cell instead of falling through to the table's
    // white and reading half-grey at rest. `hover:bg-surface-sunken` cancels
    // TableRow's built-in `hover:bg-primary-50`: the hint is non-interactive, so
    // it must not react to hover.
    <TableRow className="bg-surface-sunken hover:bg-surface-sunken h-11">
      <TableCell
        colSpan={colSpan - 1}
        className="h-11 max-w-none bg-inherit px-6"
      >
        <div className="flex items-center gap-2 text-sm">
          <Info className="text-icon-secondary size-4 shrink-0" />
          <p className="text-foreground-secondary flex-1">
            <span className="text-foreground-primary font-medium">{label}</span>{" "}
            {description}
          </p>
        </div>
      </TableCell>
      {/* The dismiss lives in its OWN cell pinned to the ACTIONS column (same
          `PIN_RIGHT` as the row menu), so × lines up with the per-row ··· and
          stays visible when the table scrolls horizontally instead of floating
          off the right edge of a full-span cell. */}
      <TableCell className={cn("h-11 px-2 text-right", PIN_RIGHT)}>
        <Button
          variant="subtle"
          size="icon-xs"
          aria-label={t({
            id: "projects.assetsTableRows.dontShowAgain",
            message: "Don't show again",
          })}
          onClick={() => onDismissHint(hintTab)}
        >
          <X />
        </Button>
      </TableCell>
    </TableRow>
  );
}
