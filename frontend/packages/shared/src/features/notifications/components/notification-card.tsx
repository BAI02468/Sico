import { useLingui } from "@lingui/react/macro";
import { type ReactElement } from "react";

import { useNotificationCardView } from "../hooks/use-notification-card-view";
import {
  type Notification,
  NotificationStatusSchema,
} from "../schemas/notification";
import { relativeTime } from "../utils/relative-time";

export function NotificationCard({
  notification,
  onRead,
  onClose,
}: {
  notification: Notification;
  onRead: (id: number) => void;
  // Called before navigation so the popover closes (legacy closes first).
  onClose?: () => void;
}): ReactElement | null {
  const { t } = useLingui();
  const card = useNotificationCardView(notification);
  if (!card) {
    return null;
  }
  const isUnread = notification.status === NotificationStatusSchema.enum.UNREAD;

  const finalize = (): void => {
    onClose?.();
    if (isUnread) {
      onRead(notification.id);
    }
  };
  const activate = (onClick: () => void) => () => {
    finalize();
    onClick();
  };

  // The row body — leading avatar + title/time line + body line. Extracted so
  // it renders identically inside both action wrappers (whole-card button and
  // read-only row) without duplication.
  const rowInner = (
    <span className="flex w-full items-start gap-3">
      <span className="shrink-0 pt-0.5">{card.leading}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        {/* Name/title row with the relative time pinned right. */}
        <span className="flex h-5 items-center gap-2">
          <span className="text-foreground-primary min-w-0 flex-1 truncate text-sm font-medium">
            {card.title}
          </span>
          <span className="text-foreground-tertiary shrink-0 text-xs">
            {relativeTime(notification.createdAt)}
          </span>
        </span>
        <span className="text-foreground-tertiary truncate text-sm">
          {card.body}
        </span>
      </span>
    </span>
  );

  // Unread dot — a 6px dot pinned to the card's top-end corner (legacy:
  // absolute right:10px / top:10px), NOT inline beside the time. Uses the same
  // `danger-500` as the nav unread badge (NavBadge) so the one "unread" concept
  // reads uniformly across the sidebar and the popover.
  const unreadDot = isUnread ? (
    <span
      role="status"
      aria-label={t({ id: "notifications.unread", message: "Unread" })}
      className="bg-danger-500 absolute end-2.5 top-2.5 size-1.5 rounded-full"
    />
  ) : null;

  // `relative` so the absolute unread dot anchors to the card. Every row gets
  // the hover tint (clickable and read-only alike) so the list reads uniformly
  // — a mix of some rows highlighting and some not looks broken.
  const rowClass =
    "relative flex h-16 w-full items-center px-6 py-3 text-left hover:bg-button-subtle-fill-hover";

  // Whole-card click (person / review rows).
  if (card.action.kind === "card") {
    return (
      <button
        type="button"
        className={rowClass}
        onClick={activate(card.action.onClick)}
      >
        {rowInner}
        {unreadDot}
      </button>
    );
  }

  // Read-only (neutral rows).
  return (
    <div className={rowClass}>
      {rowInner}
      {unreadDot}
    </div>
  );
}
