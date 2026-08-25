import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import type * as React from "react";
import { ErrorBoundary } from "react-error-boundary";

import { OrganizationProjectsPageData } from "./organization-projects-page-data";
import { OrganizationProjectsPageSkeleton } from "./organization-projects-page-skeleton";
import { ErrorView } from "../../../components/error-view";

export function OrganizationProjectsPage(): React.JSX.Element {
  const { reset } = useQueryErrorResetBoundary();
  return (
    <div className="bg-surface-canvas flex h-full min-h-0 flex-col overflow-hidden">
      <ErrorBoundary FallbackComponent={ErrorView} onReset={reset}>
        <Suspense fallback={<OrganizationProjectsPageSkeleton />}>
          <OrganizationProjectsPageData />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
