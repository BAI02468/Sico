import { useLingui } from "@lingui/react/macro";
import type * as React from "react";

import { MessageState } from "../../../components/message-state";
import { EMPTY_ILLUSTRATIONS } from "../../../constants/empty-illustration";

/** The knowledge-tags empty state. Promoted from a module render helper to a
 * component so its copy is extracted by the lingui macro and re-renders on a
 * runtime locale switch (`useLingui` hook `t`). */
export function KnowledgeTagsEmptyState(): React.JSX.Element {
  const { t } = useLingui();
  return (
    <MessageState
      fill
      illustrationUrl={EMPTY_ILLUSTRATIONS.cards.url}
      illustrationWidth={EMPTY_ILLUSTRATIONS.cards.width}
      illustrationHeight={EMPTY_ILLUSTRATIONS.cards.height}
      heading={t({
        id: "projects.knowledgeTagsContent.emptyState.heading",
        message: "No knowledge tags yet",
      })}
      body={t({
        id: "projects.knowledgeTagsContent.emptyState.body",
        message: "Create a knowledge tag to organize your assets.",
      })}
    />
  );
}
