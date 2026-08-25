import { useLingui } from "@lingui/react/macro";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import type * as React from "react";
import { ErrorBoundary } from "react-error-boundary";

import { MembersDwTab } from "./members-dw-tab";
import { type MembersTab } from "./members-page";
import { MembersPersonTab } from "./members-person-tab";
import { MembersTableSkeleton } from "./members-table-skeleton";
import { ErrorView } from "../../../components/error-view";

export type MembersTabBodyProps = {
  projectId: number;
  activeTab: MembersTab;
};

/** Renders only the active tab's body. Each tab suspends on its own query, so
 * both branches share the same error+suspense boundary shape — the fallback
 * skeleton just mirrors that tab's columns. */
export function MembersTabBody({
  projectId,
  activeTab,
}: MembersTabBodyProps): React.JSX.Element {
  const { t } = useLingui();
  const { reset } = useQueryErrorResetBoundary();
  if (activeTab === "workers") {
    return (
      <ErrorBoundary
        FallbackComponent={ErrorView}
        onReset={reset}
        resetKeys={[projectId]}
      >
        <Suspense
          fallback={
            <MembersTableSkeleton
              headers={[
                t({ id: "team.table.header.name", message: "NAME" }),
                t({ id: "team.table.header.operator", message: "OPERATOR" }),
                t({ id: "team.table.header.status", message: "STATUS" }),
                t({
                  id: "team.table.header.lastActive",
                  message: "LAST ACTIVE",
                }),
              ]}
              label={t({
                id: "team.table.loading.workers",
                message: "Loading digital workers",
              })}
            />
          }
        >
          <MembersDwTab projectId={projectId} />
        </Suspense>
      </ErrorBoundary>
    );
  }
  return (
    <ErrorBoundary
      FallbackComponent={ErrorView}
      onReset={reset}
      resetKeys={[projectId]}
    >
      <Suspense
        fallback={
          <MembersTableSkeleton
            headers={[
              t({ id: "team.table.header.name", message: "NAME" }),
              t({ id: "team.table.header.role", message: "ROLE" }),
              t({ id: "team.table.header.lastActive", message: "LAST ACTIVE" }),
            ]}
            label={t({
              id: "team.table.loading.members",
              message: "Loading members",
            })}
          />
        }
      >
        <MembersPersonTab projectId={projectId} />
      </Suspense>
    </ErrorBoundary>
  );
}
