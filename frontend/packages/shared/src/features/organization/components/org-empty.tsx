import type * as React from "react";

import { MessageState } from "../../../components/message-state";
import { EMPTY_ILLUSTRATIONS } from "../../../constants/empty-illustration";

export type OrgEmptyProps = {
  illustration: "people" | "cards" | "projects";
  heading: string;
  body: string;
};

/** Empty surface for the org tables, on the shared `MessageState` primitive.
 * The tab picks its illustration + copy; layout is pinned by `MessageState`. */
export function OrgEmpty({
  illustration,
  heading,
  body,
}: OrgEmptyProps): React.JSX.Element {
  const art = EMPTY_ILLUSTRATIONS[illustration];
  return (
    <MessageState
      illustrationUrl={art.url}
      illustrationWidth={art.width}
      illustrationHeight={art.height}
      heading={heading}
      body={body}
    />
  );
}
