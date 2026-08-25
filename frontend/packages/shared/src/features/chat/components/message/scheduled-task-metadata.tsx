import { Trans } from "@lingui/react/macro";
import { type JSX } from "react";

import { formatDateTime } from "../../utils/format-date-time";

export type ScheduledTaskMetadataProps = {
  createdAt: number;
};

export function ScheduledTaskMetadata({
  createdAt,
}: ScheduledTaskMetadataProps): JSX.Element {
  return (
    <span className="text-foreground-tertiary leading-body text-right text-xs tracking-wide whitespace-nowrap">
      <Trans id="chat.scheduledTaskMetadata.label">
        Scheduled task ·{" "}
        <time dateTime={new Date(createdAt).toISOString()}>
          {formatDateTime(createdAt)}
        </time>
      </Trans>
    </span>
  );
}
