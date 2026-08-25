import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { type JSX, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { CreateSetupBody } from "./create-setup-body";
import { CreateSetupBodySkeleton } from "./create-setup-body-skeleton";
import { CreateSetupBoundary } from "./create-setup-boundary";
import { CreateSetupErrorFallback } from "./create-setup-error-fallback";

export function CreateSetupPage(): JSX.Element {
  const { reset } = useQueryErrorResetBoundary();
  return (
    <div className="bg-surface-canvas flex h-full w-full flex-col">
      <ErrorBoundary
        FallbackComponent={CreateSetupErrorFallback}
        onReset={reset}
      >
        <Suspense
          fallback={
            <CreateSetupBoundary>
              <CreateSetupBodySkeleton />
            </CreateSetupBoundary>
          }
        >
          <CreateSetupBody />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
