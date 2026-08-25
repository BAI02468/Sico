import { Skeleton } from "@sico/ui";
import { type ReactElement } from "react";

import { NotificationCard } from "./notification-card";
import { NotificationsEmpty } from "./notifications-empty";
import { ErrorView } from "../../../components/error-view";
import { type Notification } from "../schemas/notification";

export type Filter = "all" | "unread";

// Exported for direct state testing (skeleton / error / empty / list) without
// driving the Popover open.
export function NotificationList({
  isPending,
  isError,
  error,
  refetch,
  visible,
  filter,
  markRead,
  onCardClose,
}: {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
  visible: Notification[];
  filter: Filter;
  markRead: (id: number) => void;
  onCardClose: () => void;
}): ReactElement {
  // First load, no cache yet → skeleton rows (not on background polls).
  // `h-150` (600px) pins the legacy popover list height.
  if (isPending) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading notifications"
        className="flex h-150 flex-col gap-1 py-1"
      >
        {Array.from({ length: 5 }, (_, i) => (
          <div
            // eslint-disable-next-line react/no-array-index-key -- static placeholder count
            key={i}
            className="flex h-16 items-center gap-3 px-6"
          >
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error with nothing to show → the shared ErrorView, rendered directly (not
  // via a boundary) with refetch wired to its "Try again". Gated on an empty
  // `visible` so a failed BACKGROUND poll (data already on screen) never
  // replaces the list — only an error with no data to fall back on surfaces.
  // ErrorView self-centers via MessageState `fill`, so the frame just sizes it.
  if (isError && visible.length === 0) {
    return (
      <div className="flex h-150">
        <ErrorView
          error={error}
          resetErrorBoundary={() => {
            refetch();
          }}
        />
      </div>
    );
  }

  // NotificationsEmpty self-centers via MessageState `fill`; the frame just
  // pins the popover's 600px height so it doesn't collapse to the illustration.
  if (visible.length === 0) {
    return (
      <div className="flex h-150">
        <NotificationsEmpty filter={filter} />
      </div>
    );
  }

  return (
    <div className="flex h-150 flex-col overflow-y-auto py-1">
      {visible.map((n) => (
        <NotificationCard
          key={n.id}
          notification={n}
          onRead={markRead}
          onClose={onCardClose}
        />
      ))}
    </div>
  );
}
