import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import type * as React from "react";
import { ErrorBoundary } from "react-error-boundary";

import { OrganizationMembersPageData } from "./organization-members-page-data";
import { OrganizationMembersPageSkeleton } from "./organization-members-page-skeleton";
import { ErrorView } from "../../../components/error-view";

export function OrganizationMembersPage(): React.JSX.Element {
  const { reset } = useQueryErrorResetBoundary();
  return (
    <div className="bg-surface-canvas flex h-full min-h-0 flex-col overflow-hidden">
      <ErrorBoundary FallbackComponent={ErrorView} onReset={reset}>
        <Suspense fallback={<OrganizationMembersPageSkeleton />}>
          <OrganizationMembersPageData />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
