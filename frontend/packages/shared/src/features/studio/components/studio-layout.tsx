import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { type ReactNode, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { AgentSetupSkeleton } from "./agent-setup-skeleton";
import { StudioAccessBoundary } from "./studio-access-boundary";
import { StudioSkeleton } from "./studio-skeleton";
import { ErrorView } from "../../../components/error-view/error-view";

function isSetupPath(pathname: string): boolean {
  return (
    /^\/studio\/setup\/?$/.test(pathname) ||
    /^\/studio\/[^/]+\/setup\/?$/.test(pathname)
  );
}

export function StudioLayout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const { reset } = useQueryErrorResetBoundary();
  const { pathname } = useLocation();
  const fallback = isSetupPath(pathname) ? (
    <AgentSetupSkeleton />
  ) : (
    <StudioSkeleton />
  );
  return (
    <ErrorBoundary
      FallbackComponent={ErrorView}
      onReset={reset}
      resetKeys={[pathname]}
    >
      <Suspense fallback={fallback}>
        <StudioAccessBoundary>{children}</StudioAccessBoundary>
      </Suspense>
    </ErrorBoundary>
  );
}
