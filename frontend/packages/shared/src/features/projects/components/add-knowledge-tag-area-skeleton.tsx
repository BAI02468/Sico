import { useLingui } from "@lingui/react/macro";
import { Skeleton } from "@sico/ui";
import type * as React from "react";

/**
 * Loading surface for the Add Knowledge tag area — a label + "Add tag"-sized
 * pill, so the dialog doesn't reflow when `useKnowledgeTagsQuery` resolves.
 */
export function AddKnowledgeTagAreaSkeleton(): React.JSX.Element {
  const { t } = useLingui();
  return (
    <div
      role="status"
      aria-label={t({
        id: "projects.addKnowledgeTagAreaSkeleton.loadingKnowledgeTags",
        message: "Loading knowledge tags",
      })}
      className="flex flex-col gap-3"
    >
      <div aria-hidden="true" className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-7 w-24 rounded-md" />
      </div>
    </div>
  );
}
