import { useLingui } from "@lingui/react/macro";
import { Skeleton } from "@sico/ui";
import type { JSX } from "react";

export function CreateSetupBodySkeleton(): JSX.Element {
  const { t } = useLingui();

  return (
    <div
      role="status"
      aria-label={t({
        id: "studio.createSetupBody.loading",
        message: "Loading digital worker setup form",
      })}
      className="flex w-full flex-col gap-12"
    >
      <div aria-hidden="true" className="flex flex-col gap-4">
        <Skeleton className="h-6 w-24" />
        <div className="flex items-start gap-4">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="flex flex-col gap-3">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    </div>
  );
}
