import { useLingui } from "@lingui/react/macro";
import { Skeleton } from "@sico/ui";
import type * as React from "react";

import { StudioCardSkeleton } from "./studio-card-skeleton";
import { CardGrid } from "../../../components/card-grid";

const STUDIO_CARD_SKELETON_IDS = [
  "studio-card-1",
  "studio-card-2",
  "studio-card-3",
  "studio-card-4",
  "studio-card-5",
  "studio-card-6",
] as const;

export function StudioSkeleton(): React.JSX.Element {
  const { t } = useLingui();
  return (
    <div
      role="status"
      aria-label={t({
        id: "studio.loading",
        message: "Loading Studio",
      })}
      className="bg-surface-canvas flex h-full w-full flex-col gap-6 pt-6 pb-2"
    >
      <header aria-hidden="true" className="px-5 lg:px-16">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-5 w-64" />
        </div>
      </header>
      <div
        aria-hidden="true"
        className="flex min-h-8 flex-wrap items-center justify-between gap-4 px-5 lg:px-16"
      >
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-12 rounded-lg" />
          <Skeleton className="h-8 w-18 rounded-lg" />
          <Skeleton className="h-8 w-18 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
      <div
        aria-hidden="true"
        className="min-h-0 flex-1 overflow-hidden px-5 pb-8 lg:px-16"
      >
        <CardGrid>
          {STUDIO_CARD_SKELETON_IDS.map((id) => (
            <StudioCardSkeleton key={id} />
          ))}
        </CardGrid>
      </div>
    </div>
  );
}
