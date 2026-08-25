import { useLingui } from "@lingui/react/macro";
import { Skeleton } from "@sico/ui";
import type { ReactElement } from "react";

const SKILL_SKELETON_IDS = ["skill-card-1", "skill-card-2"] as const;

export function AgentSetupSkeleton(): ReactElement {
  const { t } = useLingui();
  return (
    <div
      role="status"
      aria-label={t({
        id: "studio.agentSetup.loading",
        message: "Loading digital worker setup",
      })}
      className="bg-surface-canvas flex h-full w-full flex-col"
    >
      <header
        aria-hidden="true"
        className="flex h-12 shrink-0 items-center justify-between pr-3 pl-4"
      >
        <div className="flex items-center gap-1">
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="size-6 rounded-md" />
        </div>
      </header>
      <div aria-hidden="true" className="min-h-0 flex-1 overflow-hidden pb-6">
        <div className="mx-auto flex min-h-full w-full max-w-230 flex-col gap-12 px-6 pt-2">
          <div className="flex w-full flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-5 w-40" />
            </div>
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
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20 rounded-md" />
            </div>
            <div className="flex flex-col gap-4">
              {SKILL_SKELETON_IDS.map((id) => (
                <Skeleton key={id} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
