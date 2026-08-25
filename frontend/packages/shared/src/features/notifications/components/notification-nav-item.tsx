import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@sico/ui";
import { Bell } from "lucide-react";
import { type ReactElement, useState } from "react";

import { type Filter, NotificationList } from "./notification-list";
import { NavBadge } from "../../sidebar/components/nav-badge";
import { NavRow } from "../../sidebar/components/nav-row";
import { RailNavRow } from "../../sidebar/components/rail-nav-row";
import { useSidebarCollapsed } from "../../sidebar/hooks/use-sidebar-collapsed";
import { useNotifications } from "../hooks/use-notifications";
import { NotificationStatusSchema } from "../schemas/notification";

// Interpolated copy — module-scope `msg()` resolved with `i18n._()` (the hook
// `t` descriptor form doesn't accept a `values` field). The component calls
// `useLingui()` so a locale switch re-renders and re-runs these reads.
const TRIGGER_UNREAD = msg({
  id: "notifications.trigger.unread",
  message: "Notifications, {unreadCount} unread",
});
const TABS_UNREAD = msg({
  id: "notifications.tabs.unread",
  message: "Unread ({unreadCount})",
});

/**
 * Notification nav item — a sidebar nav row (bell + "Notification" + unread
 * badge) that opens the notification popover. Native rebuild of the legacy dwp
 * notification system, rendered inline by the sidebar menu (expanded) and rail
 * (collapsed) alongside the built-in Projects / Digital Workers rows. The
 * trigger renders as a `NavRow` when expanded and a `RailNavRow` (icon-only)
 * when collapsed, matching the built-in rows in both states.
 *
 * Layout mirrors the Figma design (node 12360-21799) and the legacy popover:
 * a 400px-wide panel with a header, an All / Unread(N) filter bar (sico
 * `<Tabs>`), then a 600px-tall scrolling list of full-bleed rows. Data +
 * polling live in `useNotifications` (react-query, 5s).
 */
// eslint-disable-next-line max-lines-per-function -- single cohesive JSX tree (Popover + trigger rows + panel); splitting would fragment the inverted NavRow/PopoverTrigger nesting. Pre-existing; tracked for refactor.
export function NotificationNavItem(): ReactElement {
  const { t } = useLingui();
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    isPending,
    isError,
    error,
    refetch,
  } = useNotifications();
  const collapsed = useSidebarCollapsed();
  // Default to the Unread tab when there are unread items (legacy behaviour),
  // but stop auto-steering once the user picks a tab — otherwise the 5s poll
  // would yank their choice back. `null` = "user hasn't chosen", so the
  // derived `filter` follows unread state until they do.
  const [chosenFilter, setChosenFilter] = useState<Filter | null>(null);
  const filter: Filter = chosenFilter ?? (unreadCount > 0 ? "unread" : "all");
  // Controlled so a card click can close the popover (legacy closes first).
  const [open, setOpen] = useState(false);
  const hasUnread = unreadCount > 0;
  // The popover trigger's accessible name — announces the unread count when
  // there is one. Computed once and shared by the expanded + collapsed rows.
  const triggerLabel = hasUnread
    ? i18n._(TRIGGER_UNREAD.id, { unreadCount }, TRIGGER_UNREAD)
    : t({ id: "notifications.trigger.label", message: "Notifications" });

  const visible =
    filter === "unread"
      ? notifications.filter(
          (n) => n.status === NotificationStatusSchema.enum.UNREAD,
        )
      : notifications;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* Inverted nesting: the row shell (NavRow/RailNavRow) is the OUTER
            element and PopoverTrigger wraps the inner <button>. base-ui injects
            its trigger behaviour (onClick / aria-haspopup / ref) onto that real
            button — if NavRow were the PopoverTrigger's render target it would
            drop those props and the popover wouldn't open. */}
      {collapsed ? (
        <RailNavRow
          icon={
            // Collapsed rail is too narrow for a numeric pill, so unread is
            // shown as a small dot on the bell's top-end corner, in the same
            // `danger-500` as the expanded NavBadge. The wrapper is `relative`
            // so the dot anchors to the icon.
            <span className="relative flex">
              <Bell aria-hidden className="size-5" />
              {hasUnread ? (
                <span className="bg-danger-500 absolute -end-0.5 -top-0.5 size-1.5 rounded-full" />
              ) : null}
            </span>
          }
          render={
            <PopoverTrigger
              render={<button type="button" aria-label={triggerLabel} />}
            />
          }
        />
      ) : (
        <NavRow
          icon={<Bell aria-hidden className="size-5" />}
          label={t({
            id: "notifications.navRow.label",
            message: "Notification",
          })}
          trailing={
            hasUnread ? (
              <NavBadge>{unreadCount > 99 ? "99+" : unreadCount}</NavBadge>
            ) : undefined
          }
          render={
            <PopoverTrigger
              render={<button type="button" aria-label={triggerLabel} />}
            />
          }
        />
      )}
      {/* Opens to the RIGHT of the sidebar row (not below) so the panel sits
            beside the nav instead of covering Digital Workers / Projects. */}
      <PopoverContent side="right" align="start" className="w-100 gap-0 p-0">
        {/* Header — Figma node 12360:21800. */}
        <PopoverTitle className="text-foreground-primary px-6 pt-4 pb-3 text-base font-medium">
          <Trans id="notifications.panel.title">Notifications</Trans>
        </PopoverTitle>
        {/* Filter bar — sico Tabs + "Mark all as read", bordered top & bottom.
              The button sits at the row's right edge (Figma 19528:54451) and is
              disabled with no unread items. */}
        <div className="border-divider flex items-center border-y px-6 py-1">
          <Tabs
            value={filter}
            onValueChange={(value) => {
              // base-ui types the value as `any`; narrow to our two filters
              // without an unsafe assertion. Recording the choice freezes the
              // auto-default so the poll can't override it.
              setChosenFilter(value === "unread" ? "unread" : "all");
            }}
          >
            <TabsList>
              <TabsTrigger value="all">
                <Trans id="notifications.tabs.all">All</Trans>
              </TabsTrigger>
              <TabsTrigger value="unread">
                {i18n._(TABS_UNREAD.id, { unreadCount }, TABS_UNREAD)}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="link"
            size="sm"
            // Match project-drawer's link treatment: a muted foreground that
            // deepens on hover/active (not the link variant's default blue).
            // disabled keeps the variant's own muted grey (#bcbbb5).
            // `p-0` trims the button's default padding so its text baseline
            // lines up with the tabs row; `font-normal` overrides the Button
            // base's `font-medium` so the label isn't visually bold.
            className="text-foreground-tertiary hover:text-foreground-secondary active:text-foreground-secondary ms-auto shrink-0 p-0 font-normal"
            disabled={!hasUnread}
            onClick={() => {
              // Freeze the current tab before clearing unread: otherwise
              // `unreadCount` drops to 0 and the derived `filter` snaps back
              // to "all", yanking the user off the Unread tab they're viewing.
              setChosenFilter(filter);
              markAllRead();
            }}
          >
            <Trans id="notifications.markAllRead">Mark all as read</Trans>
          </Button>
        </div>
        {/* List — full-bleed rows own their own padding. 600px tall (legacy).
              Four states: first-load skeleton, first-load error, empty, list.
              `isPending`/`isError` are first-load only (data survives polls), so
              a 5s tick never flashes the skeleton or error over a shown list. */}
        <NotificationList
          isPending={isPending}
          isError={isError}
          error={error}
          refetch={refetch}
          visible={visible}
          filter={filter}
          markRead={markRead}
          onCardClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
