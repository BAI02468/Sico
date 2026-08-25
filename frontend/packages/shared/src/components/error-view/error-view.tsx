import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@sico/ui";
import { useEffect } from "react";
import type * as React from "react";
import type { FallbackProps } from "react-error-boundary";

import errorIllustrationUrl from "../../assets/error.svg";
import { classifyError, type ErrorKind } from "../../utils/classify-error";
import { logger } from "../../utils/logger";
import { MessageState } from "../message-state";

export type ErrorViewKind = ErrorKind;

/**
 * Shared `<ErrorBoundary FallbackComponent>` for suspense-backed list
 * pages. Classifies the thrown error to pick copy; `resetErrorBoundary`
 * is wired through to React Query's `useQueryErrorResetBoundary` reset
 * by the parent feature root, so "Try again" both remounts the subtree
 * and clears the query's error state in one shot.
 *
 * Self-centering: delegates to `<MessageState fill>`, whose wrapper carries the
 * `role="alert"` and fills + centers in its boundary's content area — so
 * features mount it directly as the `FallbackComponent` with no per-feature
 * centering wrapper, and the fill class lives in exactly one place
 * (`flex-1 min-h-0` covers in-card boundaries, `h-full` covers full-page ones).
 */
export function ErrorView({
  error,
  resetErrorBoundary,
}: FallbackProps): React.JSX.Element {
  const { t } = useLingui();
  const kind = classifyError(error);
  // Built from the useLingui() hook `t` so a locale switch re-renders the
  // component and recomputes every entry against the active locale.
  const copyByKind: Record<ErrorKind, { heading: string; body: string }> = {
    network: {
      heading: t({
        id: "errorView.network.heading",
        message: "Can't reach the server",
      }),
      body: t({
        id: "errorView.network.body",
        message: "Check your connection and try again.",
      }),
    },
    server: {
      heading: t({
        id: "errorView.server.heading",
        message: "Something went wrong",
      }),
      body: t({
        id: "errorView.server.body",
        message: "Something went wrong on our end. Try again in a moment.",
      }),
    },
    schema: {
      heading: t({
        id: "errorView.schema.heading",
        message: "Unexpected response",
      }),
      body: t({
        id: "errorView.schema.body",
        message: "We received unexpected data. Try refreshing the page.",
      }),
    },
    unknown: {
      heading: t({
        id: "errorView.unknown.heading",
        message: "Something went wrong",
      }),
      body: t({
        id: "errorView.unknown.body",
        message: "Something went wrong on this page. Try again.",
      }),
    },
  };
  const copy = copyByKind[kind];
  // Mirror the boundary chrome's one-shot logging side-effect: feature
  // pages were a logging blind spot. Keyed on `error` so it fires once
  // per caught error, not on every render.
  useEffect(() => {
    logger.error("ErrorView caught", { error, kind });
  }, [error, kind]);
  return (
    <MessageState
      fill
      role="alert"
      illustrationUrl={errorIllustrationUrl}
      illustrationWidth={180}
      illustrationHeight={100}
      heading={copy.heading}
      body={copy.body}
      action={
        <Button variant="primary" onClick={resetErrorBoundary}>
          <Trans id="common.action.tryAgain">Try again</Trans>
        </Button>
      }
    />
  );
}
