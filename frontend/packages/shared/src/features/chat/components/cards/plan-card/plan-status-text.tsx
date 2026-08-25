import { useLingui } from "@lingui/react/macro";
import { type JSX } from "react";

import { type PlanStatus, PlanStatusSchema } from "../../../schemas/plan";

// The plan's execution status as a localized label. A component (not a helper)
// so its `useLingui()` hook `t` is a macro lingui can statically extract, and a
// locale switch re-renders it. RUNNING / UNKNOWN / NO_PLAN read as "in
// progress"; COMPLETED + REQUIRE_HUMAN_INPUT as "completed"; FAILED / CANCELLED
// get their own line.
export function PlanStatusText({
  status,
}: {
  status: PlanStatus;
}): JSX.Element {
  const { t } = useLingui();
  switch (status) {
    case PlanStatusSchema.enum.COMPLETED:
    case PlanStatusSchema.enum.REQUIRE_HUMAN_INPUT:
      return (
        <>
          {t({
            id: "chat.planCard.status.completed",
            message: "Execution completed",
          })}
        </>
      );
    case PlanStatusSchema.enum.FAILED:
      return (
        <>
          {t({
            id: "chat.planCard.status.failed",
            message: "Execution failed",
          })}
        </>
      );
    case PlanStatusSchema.enum.CANCELLED:
      return (
        <>
          {t({
            id: "chat.planCard.status.stopped",
            message: "Execution stopped",
          })}
        </>
      );
    default:
      return (
        <>
          {t({
            id: "chat.planCard.status.inProgress",
            message: "Execution in progress",
          })}
        </>
      );
  }
}
