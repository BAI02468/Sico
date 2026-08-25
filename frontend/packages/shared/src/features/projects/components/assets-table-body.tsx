import { Trans, useLingui } from "@lingui/react/macro";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@sico/ui";
import { cn } from "@sico/ui/lib/utils.ts";
import { type LucideIcon } from "lucide-react";
import type * as React from "react";

import { type AssetActionKind, AssetRow } from "./asset-row";
import { renderAssetSkeletonCells } from "./asset-row-skeleton";
import { AssetsHintRow } from "./assets-hint-row";
import { CREATOR_MAX, PIN_HEAD_LEFT, PIN_HEAD_RIGHT } from "./pinned-columns";
import { type HintTab } from "../hooks/use-dismissed-hints";
import type { AssetRow as AssetRowData } from "../types";

// How many skeleton rows to append while the next page loads. Matches a
// typical page size visually without dominating the viewport.
const LOADING_MORE_ROW_COUNT = 3;

// CREATED TIME renders separately as a sort toggle, so it is excluded here.
const PLAIN_HEADERS_COUNT = 3;

// Full column span for the in-table hint bar: the plain headers + CREATED TIME +
// ACTIONS. Derived so it can't drift from the header row.
const COLUMN_COUNT = PLAIN_HEADERS_COUNT + 2;

// Centering wrapper for the empty state — the surrounding `bg-surface-basic …
// rounded-2xl` scroll card is the persistent shell in `AssetsTable`, so this is
// centering-only (no surface/shadow/radius).
const CENTER = "flex min-h-0 flex-1 items-center justify-center";

// Content-shaped placeholder row mirroring the 5-column AssetRow layout. Shares
// its cells with `AssetsTableSkeleton`'s cold-load row via `renderAssetSkeletonCells`
// so the loading-more affordance reads as part of the same table; only the row
// shell (key, aria-hidden, test id) differs.
function renderLoadingMoreRow(key: number): React.JSX.Element {
  return (
    <TableRow
      key={`loading-more-${key}`}
      aria-hidden="true"
      className="bg-surface-basic h-16"
      data-testid="assets-table-loading-more-row"
    >
      {renderAssetSkeletonCells()}
    </TableRow>
  );
}

export type AssetsTableBodyProps = {
  visibleRows: AssetRowData[];
  ariaSort: "ascending" | "descending";
  SortGlyph: LucideIcon;
  toggleSort: () => void;
  onOpen: (row: AssetRowData) => void;
  onAction: (row: AssetRowData, kind: AssetActionKind) => void;
  canDelete: (row: AssetRowData) => boolean;
  hintTab: HintTab | null;
  onDismissHint: (tab: HintTab) => void;
  emptyState: React.JSX.Element;
  isFetchingNextPage: boolean;
};

// The rows table (header sort toggle + the mapped `<AssetRow>`s). A component
// (not a render helper) so its `useLingui()` copy re-renders on a runtime
// locale switch and lingui can statically extract the messages. `onAction` is
// wired for every row — all three categories now carry a `···` menu (Knowledge:
// Edit/Download/Delete; Deliverable: Download/Delete; Experience: Delete) — and
// `onOpen` too, because asset-row owns the navigability gate. The hint bar (when
// `hintTab` is set) and the empty state (when there are no rows) render inside
// the card so the header + hint stay visible on an empty-but-hinted tab. The
// surrounding scroll card (and the infinite-scroll sentinel) is owned by
// `AssetsTable`.
export function AssetsTableBody({
  visibleRows,
  ariaSort,
  SortGlyph,
  toggleSort,
  onOpen,
  onAction,
  canDelete,
  hintTab,
  onDismissHint,
  emptyState,
  isFetchingNextPage,
}: AssetsTableBodyProps): React.JSX.Element {
  const { t } = useLingui();
  return (
    <>
      <Table>
        <TableHeader>
          {/* Sticky column-header row: pinned to the top of the scroll card so
              labels stay visible as the body scrolls. `bg-surface-basic` is
              required (the scrolling rows would otherwise show through), and
              `z-30` sits above the body's pinned cells (z-10) and the pinned
              header cells (z-20) so it covers both when they scroll under it. */}
          <TableRow className="bg-surface-basic sticky top-0 z-30 h-13">
            <TableHead className={cn("h-13 px-6 text-sm", PIN_HEAD_LEFT)}>
              <Trans id="projects.assetsTableRows.assetName">ASSET NAME</Trans>
            </TableHead>
            <TableHead className="h-13 px-6 text-sm">
              <Trans id="projects.assetsTableRows.type">TYPE</Trans>
            </TableHead>
            <TableHead className={cn("h-13 px-6 text-sm", CREATOR_MAX)}>
              <Trans id="projects.assetsTableRows.creator">CREATOR</Trans>
            </TableHead>
            <TableHead aria-sort={ariaSort} className="h-13 px-6 text-sm">
              <button
                type="button"
                className="flex items-center gap-1 uppercase"
                onClick={toggleSort}
              >
                <Trans id="projects.assetsTableRows.createdTime">
                  CREATED TIME
                </Trans>
                <SortGlyph className="text-icon-secondary size-4" />
              </button>
            </TableHead>
            <TableHead
              aria-label={t({
                id: "projects.assetsTableRows.actions",
                message: "Actions",
              })}
              className={cn("h-13 px-2 text-right text-sm", PIN_HEAD_RIGHT)}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {hintTab ? (
            <AssetsHintRow
              hintTab={hintTab}
              onDismissHint={onDismissHint}
              colSpan={COLUMN_COUNT}
            />
          ) : null}
          {visibleRows.map((row) => (
            <AssetRow
              key={`${row.type}-${row.id}`}
              row={row}
              onOpen={() => onOpen(row)}
              onAction={(kind) => onAction(row, kind)}
              canDelete={canDelete(row)}
            />
          ))}
          {isFetchingNextPage && visibleRows.length > 0
            ? Array.from({ length: LOADING_MORE_ROW_COUNT }, (_, idx) =>
                renderLoadingMoreRow(idx),
              )
            : null}
        </TableBody>
      </Table>
      {visibleRows.length === 0 ? (
        <div className={CENTER}>{emptyState}</div>
      ) : null}
    </>
  );
}
