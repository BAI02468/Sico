import { useLingui } from "@lingui/react/macro";
import { type ReactElement } from "react";

import { MessageState } from "../../../components/message-state";
import { EMPTY_ILLUSTRATIONS } from "../../../constants/empty-illustration";

/**
 * Empty state for the notification popover (Figma node 19528-54445) — the
 * shared stacked-cards illustration + a friendly heading and a tab-aware body
 * (mirrors legacy's All-vs-Unread copy). Built on the shared `MessageState`
 * primitive, like `digital-worker`'s `EmptyState`, and reuses the shared
 * `cards` illustration rather than a feature-local SVG.
 */
export function NotificationsEmpty({
  filter,
}: {
  filter: "all" | "unread";
}): ReactElement {
  const { t } = useLingui();
  return (
    <MessageState
      fill
      illustrationUrl={EMPTY_ILLUSTRATIONS.cards.url}
      illustrationWidth={EMPTY_ILLUSTRATIONS.cards.width}
      illustrationHeight={EMPTY_ILLUSTRATIONS.cards.height}
      heading={t({
        id: "notifications.empty.heading",
        message: "You're all caught up",
      })}
      body={
        filter === "unread"
          ? t({
              id: "notifications.empty.unread",
              message: "No unread notifications",
            })
          : t({
              id: "notifications.empty.all",
              message: "No notifications yet",
            })
      }
    />
  );
}
