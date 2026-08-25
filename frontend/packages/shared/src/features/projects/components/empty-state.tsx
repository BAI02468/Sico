import { useLingui } from "@lingui/react/macro";
import { Button } from "@sico/ui";
import { Plus } from "lucide-react";
import type * as React from "react";

import { MessageState } from "../../../components/message-state";
import { EMPTY_ILLUSTRATIONS } from "../../../constants/empty-illustration";

export type EmptyStateProps = {
  // Opens the create-project dialog. Optional so the empty state still renders
  // read-only where no create affordance is wanted.
  onCreate?: () => void;
};

/** Empty state for `/project` — offers a "Create project" CTA when `onCreate`
 * is provided (copy mirrors the PR346 design draft). */
export function EmptyState({
  onCreate,
}: EmptyStateProps = {}): React.JSX.Element {
  const { t } = useLingui();
  const heading = t({
    id: "projects.emptyState.heading",
    message: "Nothing here yet",
  });
  const body = t({
    id: "projects.emptyState.body",
    message: "Projects hold your digital workers and their work.",
  });
  const createButton = t({
    id: "projects.emptyState.createButton",
    message: "Create Project",
  });

  return (
    <MessageState
      fill
      illustrationUrl={EMPTY_ILLUSTRATIONS.projects.url}
      illustrationWidth={EMPTY_ILLUSTRATIONS.projects.width}
      illustrationHeight={EMPTY_ILLUSTRATIONS.projects.height}
      heading={heading}
      body={body}
      action={
        onCreate ? (
          <Button variant="primary" onClick={onCreate}>
            <Plus aria-hidden="true" />
            {createButton}
          </Button>
        ) : undefined
      }
    />
  );
}
