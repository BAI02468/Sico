import { Trans } from "@lingui/react/macro";
import type * as React from "react";

export function OrganizationStatCount({
  count,
  kind,
}: {
  count: number;
  kind: "available" | "total";
}): React.JSX.Element {
  return kind === "available" ? (
    <Trans id="organization.projects.stat.availableCount">
      <span className="text-foreground-primary text-3xl font-medium">
        {count}
      </span>{" "}
      <span className="text-foreground-secondary text-sm">Available</span>
    </Trans>
  ) : (
    <Trans id="organization.projects.stat.totalCount">
      <span className="text-foreground-primary text-3xl font-medium">
        {count}
      </span>{" "}
      <span className="text-foreground-secondary text-sm">total</span>
    </Trans>
  );
}
