import { useLingui } from "@lingui/react/macro";
import { Tooltip, TooltipContent, TooltipTrigger } from "@sico/ui";
import { TriangleAlert } from "lucide-react";
import type * as React from "react";

import type { AssetRow as AssetRowData } from "../types";

/** The TYPE column content. A FAILED Knowledge extraction replaces the plain
 * "Knowledge" label with a red `Extraction failed` unit + re-upload tooltip
 * (§5 / §6 dec 3); otherwise the plain type label per row kind. Promoted from a
 * module render helper to a component so the §5 failed copy is extracted by the
 * lingui macro and re-renders on a runtime locale switch (`useLingui` hook `t`). */
export function AssetTypeCell({
  rowType,
  isFailed,
}: {
  rowType: AssetRowData["type"];
  isFailed: boolean;
}): React.ReactNode {
  const { t } = useLingui();
  if (isFailed) {
    return (
      <Tooltip>
        <TooltipTrigger
          // The row is a button; a click on this tooltip must not also navigate.
          onClick={(event) => event.stopPropagation()}
          className="text-status-error-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <TriangleAlert className="size-4" />
          {t({
            id: "projects.pollIndicator.failedText",
            message: "Extraction failed",
          })}
        </TooltipTrigger>
        <TooltipContent>
          {t({
            id: "projects.pollIndicator.failedTip",
            message:
              "Make sure the file's permission is open to public, then re-upload.",
          })}
        </TooltipContent>
      </Tooltip>
    );
  }
  if (rowType === "experience") {
    return t({ id: "projects.assetType.experience", message: "Experience" });
  }
  if (rowType === "deliverable") {
    return t({ id: "projects.assetType.deliverable", message: "Deliverable" });
  }
  return t({ id: "projects.assetType.knowledge", message: "Knowledge" });
}
