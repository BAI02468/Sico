import { Trans } from "@lingui/react/macro";
import { Button } from "@sico/ui";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import type { ReactElement } from "react";

import type { SaveQueueStatus } from "../../../hooks/use-latest-save-queue";

export function StudioAutosaveStatus({
  status,
  valid,
  canRetry,
  onRetry,
  onDiscard,
  canDiscard,
  onConflict,
}: {
  status: SaveQueueStatus;
  valid: boolean;
  canRetry: boolean;
  onRetry: () => void;
  onDiscard: () => void;
  canDiscard: boolean;
  onConflict: () => void;
}): ReactElement {
  if (status === "error" || status === "conflict") {
    return (
      <div className="text-status-error-foreground flex items-center gap-1 text-sm">
        <TriangleAlert className="size-4 shrink-0" aria-hidden />
        <span role="alert">
          {status === "conflict" ? (
            <Trans id="studio.autosave.conflict">Newer version available</Trans>
          ) : (
            <Trans id="studio.autosave.failed">Couldn&apos;t save</Trans>
          )}
        </span>
        {status === "error" ? (
          <>
            {canRetry ? (
              <Button type="button" variant="link" size="xs" onClick={onRetry}>
                <Trans id="common.action.tryAgain">Try again</Trans>
              </Button>
            ) : null}
            {canDiscard ? (
              <Button
                type="button"
                variant="link"
                size="xs"
                onClick={onDiscard}
              >
                <Trans id="studio.autosave.discardFailed">
                  Discard failed upload
                </Trans>
              </Button>
            ) : null}
          </>
        ) : (
          <Button type="button" variant="link" size="xs" onClick={onConflict}>
            <Trans id="common.action.reload">Reload</Trans>
          </Button>
        )}
      </div>
    );
  }
  if (!valid) {
    return (
      <span
        role="status"
        aria-live="polite"
        className="text-status-error-foreground flex items-center gap-1 text-sm"
      >
        <TriangleAlert className="size-4 shrink-0" aria-hidden />
        <Trans id="studio.autosave.invalid">Complete required fields</Trans>
      </span>
    );
  }
  if (status === "scheduled" || status === "saving") {
    return (
      <span
        role="status"
        aria-live="polite"
        className="text-foreground-secondary flex items-center gap-1 text-sm"
      >
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
        <Trans id="common.status.saving">Saving…</Trans>
      </span>
    );
  }
  return (
    <span
      role="status"
      aria-live="polite"
      className={
        status === "saved"
          ? "text-foreground-secondary flex items-center gap-1 text-sm"
          : "sr-only"
      }
    >
      {status === "saved" ? (
        <>
          <Check className="size-4 shrink-0" aria-hidden />
          <Trans id="common.status.saved">Saved</Trans>
        </>
      ) : null}
    </span>
  );
}
