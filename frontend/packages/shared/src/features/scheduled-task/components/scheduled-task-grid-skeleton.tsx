import { type ReactElement } from "react";

import { ScheduledTaskCardSkeleton } from "./scheduled-task-card-skeleton";

export type ScheduledTaskGridSkeletonProps = {
  count?: number;
};

export function ScheduledTaskGridSkeleton({
  count = 4,
}: ScheduledTaskGridSkeletonProps): ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }, (_, index) => (
        <ScheduledTaskCardSkeleton key={index} />
      ))}
    </div>
  );
}
