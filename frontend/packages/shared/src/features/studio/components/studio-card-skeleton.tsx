import { Skeleton } from "@sico/ui";
import type * as React from "react";

export function StudioCardSkeleton(): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      data-testid="studio-card-skeleton"
      className="bg-surface-basic border-stroke-subtle-card-rest flex h-32 w-full flex-col items-start justify-between rounded-xl border p-5"
    >
      <div className="flex w-full min-w-0 items-center gap-3">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <div className="flex w-full items-center gap-1.5">
        <Skeleton className="size-3.5 shrink-0 rounded-sm" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    </div>
  );
}
