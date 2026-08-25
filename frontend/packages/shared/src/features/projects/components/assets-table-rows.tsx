import { cn } from "@sico/ui/lib/utils.ts";
import { ArrowDown, ArrowUp } from "lucide-react";
import type * as React from "react";

import { renderRowDialogs } from "./asset-row-actions";
import { AssetsEmpty } from "./assets-empty";
import { AssetsTableBody } from "./assets-table-body";
import { useAssetRowActions } from "../hooks/use-asset-row-actions";
import { useAssetsPoll } from "../hooks/use-assets-poll";
import { useSuspenseAssetsInfiniteQuery } from "../hooks/use-assets-query";
import {
  resolveHintTab,
  useDismissedHints,
} from "../hooks/use-dismissed-hints";
import { useExtractionResultToast } from "../hooks/use-extraction-toasts";
import { useTableScrollEdges } from "../hooks/use-table-scroll-edges";
import type { AssetSearch } from "../schemas/asset-search";
import type {
  AssetCategory,
  AssetCreator,
  AssetRow as AssetRowData,
} from "../types";
import { sameIdentity } from "../utils/same-identity";

export type AssetsTableRowsProps = {
  projectId: number;
  category: AssetCategory;
  search: AssetSearch;
  onSearchChange: (next: Partial<AssetSearch>) => void;
  /**
   * Append content-shaped skeleton rows to the table body while the
   * infinite-scroll pager loads the next page (mirrors the cold-load skeleton
   * row shape). Owned by `AssetsTable` (which holds the pager); passed in so
   * the placeholder rows live inside the SAME `<TableBody>` as the real rows,
   * keeping column widths aligned and the table from reflowing on resolve.
   */
  isFetchingNextPage?: boolean;
  /** asset.manage — may delete ANY asset (admin). */
  canManageAsset: boolean;
  /** asset.manage.own — may delete OWN assets (member). */
  canManageAssetOwn: boolean;
  /** Current user's email, for the per-row `.own` delete check. */
  userEmail: string | null;
};

// Centering wrapper for the empty state — the surrounding `bg-surface-basic …
// rounded-2xl` scroll card is the persistent shell in `AssetsTable`, so this is
// centering-only (no surface/shadow/radius).
const CENTER = "flex min-h-0 flex-1 items-center justify-center";

// Empty-state override: the scroll card injects `flex-1` onto EVERY descendant
// table-container (`**:data-[slot=table-container]:flex-1`). With rows that's
// right — the table fills and scrolls. But when the only body content is the
// hint row and the empty state renders below, that `flex-1` makes the header+hint
// table share the column's height 50/50 with `CENTER` (also `flex-1`), pushing
// the empty state into the lower half instead of centering it in the card. Added
// to the `contents` table wrapper (which adds no box of its own) only when empty,
// so the table shrinks to its content and `CENTER` takes the rest. Scoped to the
// container (Table's own `className` lands on the inner <table>).
const EMPTY_TABLE = "[&_[data-slot=table-container]]:flex-none";

// The `.own` delete check: does `userEmail` own this asset? A Knowledge doc is
// uploaded by a user (match `creatorUsername`); a Deliverable/Experience is
// produced by a DW, so the OWNER is the human operator who ran it
// (`operatorUsername`, per the PRD "DW Operator may delete"). Fails CLOSED on an
// unknown identity or an older row that predates the backend operator field —
// `sameIdentity` returns false on a null/empty candidate or user.
export function ownsAsset(
  creator: AssetCreator,
  userEmail: string | null,
): boolean {
  return creator.kind === "user"
    ? sameIdentity(creator.username, userEmail)
    : sameIdentity(creator.operatorUsername, userEmail);
}

// Free-text filter + createdAt sort applied to the ALREADY-LOADED rows. The
// category split now lives in the route (one endpoint per path), so there is no
// tab filter here. NOTE (§ pagination): search/sort act only on loaded pages —
// correct for small lists (the common case); a backend `keyword`/`sort` param
// would be needed to filter/sort across unfetched pages (follow-up). Because the
// infinite-scroll sentinel stays mounted even when a search hides every loaded
// row (empty state), the observer keeps pulling further pages while `hasNextPage`
// — so a match on a not-yet-loaded page is still reached by scrolling, rather
// than the search stalling on page 1.
//
// FOLLOW-UP (sico-review I-B): the flip side of that auto-load is that a search
// matching NOTHING walks the sentinel through every remaining page — i.e. a
// no-match query on a large list fires a burst of sequential fetches until
// `hasNextPage` clears. It terminates and is harmless on the small lists this
// release targets, but the real fix is the backend `keyword` param above (so the
// server returns only matches); short of that a page-count cap or an explicit
// "Load more" affordance would bound it. Tracked, not addressed here.
function selectVisibleRows(
  rows: AssetRowData[],
  search: AssetSearch,
): AssetRowData[] {
  const query = search.q.trim().toLowerCase();
  const byQuery = query
    ? rows.filter((row) => row.name.toLowerCase().includes(query))
    : rows;
  return [...byQuery].sort((a, b) =>
    search.sort === "asc"
      ? a.createdAt - b.createdAt
      : b.createdAt - a.createdAt,
  );
}

/**
 * The DATA-driven inner of the assets table — the part wrapped by `AssetsTable`'s
 * `<Suspense>` + `<ErrorBoundary>`. Reads the SUSPENSE list query (so a cold load
 * suspends to the bare-skeleton fallback and an error throws to the boundary —
 * no in-component pending/error branch), self-polls extraction status, applies
 * the loaded-rows filter + sort, and renders the rows table (or the empty state).
 * The toolbar, scroll card, and infinite-scroll sentinel live in `AssetsTable`
 * OUTSIDE this Suspense boundary, so they stay mounted across loading/error.
 */
export function AssetsTableRows({
  projectId,
  category,
  search,
  onSearchChange,
  isFetchingNextPage = false,
  canManageAsset,
  canManageAssetOwn,
  userEmail,
}: AssetsTableRowsProps): React.JSX.Element {
  const query = useSuspenseAssetsInfiniteQuery(projectId, category);
  const rows = query.data.pages.flatMap((page) => page.items);

  useAssetsPoll(projectId, category, rows);
  useExtractionResultToast(rows);

  // Callback ref for the `group/table` wrapper: the hook toggles its
  // `data-scroll-*`, which the pinned columns read to gate their frosted edge. A
  // callback ref (not a stored ref) so it re-attaches when the conditionally
  // rendered wrapper remounts (e.g. after a search empties then refills).
  const setTableWrapperRef = useTableScrollEdges();

  const { dismissedHints, dismissHint } = useDismissedHints();
  const rowActions = useAssetRowActions(projectId);

  const visibleRows = selectVisibleRows(rows, search);
  const hintTab = resolveHintTab(category, dismissedHints);
  const canDelete = (row: AssetRowData): boolean =>
    canManageAsset || (canManageAssetOwn && ownsAsset(row.creator, userEmail));
  const SortGlyph = search.sort === "asc" ? ArrowUp : ArrowDown;
  const ariaSort = search.sort === "asc" ? "ascending" : "descending";
  const toggleSort = (): void =>
    onSearchChange({ sort: search.sort === "asc" ? "desc" : "asc" });

  // The empty surface (search vs category).
  const emptyState = search.q.trim() ? (
    <AssetsEmpty variant="search" query={search.q} />
  ) : (
    <AssetsEmpty variant="category" category={category} />
  );

  // Render the table when there are rows OR a hint is active — an empty-but-
  // hinted category (e.g. Deliverable) still shows the header + hint bar.
  const showTable = visibleRows.length > 0 || hintTab !== null;

  return (
    <>
      {showTable ? (
        // `group/table` + `data-scroll-*`: the pinned columns read these (set by
        // `useTableScrollEdges`) to gate their frosted edge only while scrollable.
        // Defaults mean "no overflow" → no fade until the hook's first sync.
        <div
          ref={setTableWrapperRef}
          data-testid="assets-table-shell"
          className={cn(
            "group/table contents",
            visibleRows.length === 0 && EMPTY_TABLE,
          )}
          data-scroll-start="true"
          data-scroll-end="true"
        >
          <AssetsTableBody
            visibleRows={visibleRows}
            ariaSort={ariaSort}
            SortGlyph={SortGlyph}
            toggleSort={toggleSort}
            onOpen={rowActions.handleOpen}
            onAction={rowActions.handleAction}
            canDelete={canDelete}
            hintTab={hintTab}
            onDismissHint={dismissHint}
            emptyState={emptyState}
            isFetchingNextPage={isFetchingNextPage}
          />
        </div>
      ) : (
        <div className={CENTER}>{emptyState}</div>
      )}
      {renderRowDialogs({ projectId, actions: rowActions })}
    </>
  );
}
