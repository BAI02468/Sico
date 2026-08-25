import { Trans } from "@lingui/react/macro";
import { Button, FieldDescription, FieldError } from "@sico/ui";
import { type JSX } from "react";

import { type LoadState } from "../../digital-worker/utils/load-state";

export function CreateStudioAgentDialogOrganizationStatus({
  state,
  onRetry,
}: {
  state: LoadState;
  onRetry: () => void;
}): JSX.Element | null {
  if (state === "ready") {
    return null;
  }
  if (state === "loading") {
    return (
      <FieldDescription role="status" aria-live="polite">
        <Trans id="studio.createDialog.organizationLoading">
          Loading your organization…
        </Trans>
      </FieldDescription>
    );
  }
  return (
    <FieldError className="flex items-center gap-2">
      <span>
        {state === "error" ? (
          <Trans id="studio.createDialog.organizationLoadFailed">
            We couldn&apos;t load your organization.
          </Trans>
        ) : (
          <Trans id="studio.createDialog.organizationUnavailable">
            No organization is available for your account.
          </Trans>
        )}
      </span>
      {state === "error" ? (
        <Button type="button" variant="link" size="xs" onClick={onRetry}>
          <Trans id="common.action.tryAgain">Try again</Trans>
        </Button>
      ) : null}
    </FieldError>
  );
}
