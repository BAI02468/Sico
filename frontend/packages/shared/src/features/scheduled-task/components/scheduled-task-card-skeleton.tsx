import { Skeleton } from "@sico/ui";
import { type ReactElement } from "react";

export function ScheduledTaskCardSkeleton(): ReactElement {
  return (
    <div
      aria-hidden="true"
      data-testid="scheduled-task-card-skeleton"
      className="bg-surface-basic border-stroke-subtle-card-rest flex min-w-0 flex-col gap-4 rounded-xl border px-4 py-3"
    >
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-4 w-8 rounded-full" />
      </div>
    </div>
  );
}
