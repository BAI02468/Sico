import { useLingui } from "@lingui/react/macro";
import { Skeleton } from "@sico/ui";
import type * as React from "react";

import { OrganizationTableRowsSkeleton } from "./organization-table-rows-skeleton";

export function OrganizationMembersPageSkeleton(): React.JSX.Element {
  const { t } = useLingui();
  return (
    <div
      role="status"
      aria-label={t({
        id: "organization.members.loading",
        message: "Loading members",
      })}
      className="flex h-full min-h-0 w-full flex-1 flex-col gap-3 overflow-hidden ps-7 pe-16 pt-8 pb-13"
    >
      <Skeleton aria-hidden="true" className="h-8 w-48" />
      <div
        aria-hidden="true"
        data-testid="organization-members-action-strip"
        className="flex h-8 justify-between"
      >
        <Skeleton
          data-testid="organization-members-action-placeholder"
          className="h-5 w-20"
        />
        <Skeleton
          data-testid="organization-members-action-placeholder"
          className="h-8 w-24"
        />
      </div>
      <div className="bg-surface-basic shadow-m flex min-h-0 flex-1 overflow-hidden rounded-2xl">
        <OrganizationTableRowsSkeleton columns={4} />
      </div>
    </div>
  );
}
