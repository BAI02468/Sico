import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { toast } from "@sico/ui";
import { useEffect, useRef } from "react";

import { ExtractionStatusSchema } from "../schemas/asset";
import type { AssetRow } from "../types";

const { UPLOADED, INGESTED, FAILED } = ExtractionStatusSchema.enum;

// A stable fingerprint of the knowledge docs' (id, status), so the watcher
// effect re-runs only when a status actually changes — not on every unrelated
// re-render (search keystrokes etc.), where `rows` is a fresh array each time.
function statusKey(rows: readonly AssetRow[]): string {
  return rows
    .filter((row) => row.type === "knowledge")
    .map((row) => `${row.id}:${row.status}`)
    .join(",");
}

// Registration only queues extraction; the real result lands later via the
// 5s poll. This watches each Knowledge doc's status and, once NO row is still
// UPLOADED (the batch settled), fires ONE summary toast for everything that
// transitioned UPLOADED → INGESTED/FAILED since the last summary. The first
// pass seeds the snapshot with no prior status, so already-settled history rows
// never count — only docs actually observed leaving UPLOADED do.
export function useExtractionResultToast(rows: readonly AssetRow[]): void {
  const { t } = useLingui();
  const prevStatus = useRef(new Map<number, number>());
  const pending = useRef({ ingested: 0, failed: 0 });
  const key = statusKey(rows);
  useEffect(() => {
    const docs = rows.filter((row) => row.type === "knowledge");
    const prev = prevStatus.current;
    for (const doc of docs) {
      const was = prev.get(doc.id);
      if (was === UPLOADED && doc.status === INGESTED) {
        pending.current.ingested += 1;
      } else if (was === UPLOADED && doc.status === FAILED) {
        pending.current.failed += 1;
      }
    }
    prevStatus.current = new Map(docs.map((doc) => [doc.id, doc.status]));
    const anyUploading = docs.some((doc) => doc.status === UPLOADED);
    const { ingested, failed } = pending.current;
    if (!anyUploading && ingested + failed > 0) {
      // Inlined (not a module helper) so the hook `t` is a macro lingui can
      // statically extract; the `failed` singular/plural goes through `plural`.
      if (failed === 0) {
        toast.success(
          t({
            id: "projects.extraction.complete",
            message: `Extraction complete — ${ingested} added.`,
          }),
        );
      } else if (ingested === 0) {
        toast.error(
          t({
            id: "projects.extraction.failed",
            message: plural(failed, {
              one: "Extraction failed for # item.",
              other: "Extraction failed for # items.",
            }),
          }),
        );
      } else {
        toast.error(
          t({
            id: "projects.extraction.partial",
            message: `Extraction finished — ${ingested} added, ${failed} failed.`,
          }),
        );
      }
      pending.current = { ingested: 0, failed: 0 };
    }
    // `t` is a dep because the inlined toast copy above uses it, but a `t`-only
    // re-run (e.g. a mid-session locale switch) can't double-fire the summary:
    // this run
    // already refreshed `prevStatus` to the current statuses, so the diff loop
    // above adds nothing to `pending`, and `pending` was reset to 0 after the
    // last emit — so `ingested + failed` is 0 and the toast is skipped.
    // Keyed on the status fingerprint, not the `rows` array identity (M4).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `rows` is read but the effect is intentionally gated on the status fingerprint
  }, [key, t]);
}
