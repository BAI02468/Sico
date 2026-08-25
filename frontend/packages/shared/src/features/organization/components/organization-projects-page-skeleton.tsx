import { useLingui } from "@lingui/react/macro";
import { Skeleton } from "@sico/ui";
import type * as React from "react";

import { OrganizationTableRowsSkeleton } from "./organization-table-rows-skeleton";

export function OrganizationProjectsPageSkeleton(): React.JSX.Element {
  const { t } = useLingui();
  return (
    <div
      role="status"
      aria-label={t({
        id: "organization.projects.loading",
        message: "Loading projects",
      })}
      className="flex h-full min-h-0 w-full flex-1 flex-col gap-3 overflow-hidden ps-7 pe-16 pt-8 pb-13"
    >
      <Skeleton aria-hidden="true" className="h-8 w-48" />
      <div aria-hidden="true" className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton
            // eslint-disable-next-line react/no-array-index-key -- static stat placeholders
            key={index}
            data-testid="organization-project-stat-skeleton"
            className="min-h-32 rounded-2xl"
          />
        ))}
      </div>
      <div className="bg-surface-basic shadow-m flex min-h-0 flex-1 overflow-hidden rounded-2xl">
        <OrganizationTableRowsSkeleton columns={5} />
      </div>
    </div>
  );
}
