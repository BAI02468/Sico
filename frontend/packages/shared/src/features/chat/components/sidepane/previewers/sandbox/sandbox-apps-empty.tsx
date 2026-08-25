import { useLingui } from "@lingui/react/macro";
import type * as React from "react";

import { MessageState } from "../../../../../../components/message-state";
import { EMPTY_ILLUSTRATIONS } from "../../../../../../constants/empty-illustration";

// Empty state for the manage-apps table — no apps installed on the current
// device. Wraps the shared MessageState with sandbox-specific copy + the
// generic `cards` empty illustration.
export function SandboxAppsEmpty(): React.JSX.Element {
  const { t } = useLingui();
  const heading = t({
    id: "chat.sandboxAppsEmpty.heading",
    message: "No apps installed",
  });
  const body = t({
    id: "chat.sandboxAppsEmpty.body",
    message: "Apps will appear here.",
  });

  return (
    <MessageState
      fill
      illustrationUrl={EMPTY_ILLUSTRATIONS.cards.url}
      illustrationWidth={EMPTY_ILLUSTRATIONS.cards.width}
      illustrationHeight={EMPTY_ILLUSTRATIONS.cards.height}
      heading={heading}
      body={body}
    />
  );
}
