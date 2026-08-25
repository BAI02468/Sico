import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { type ReactElement, type ReactNode } from "react";

import { scheduledTaskNotificationView } from "./card-views/scheduled-task-notification-view";
import { DwAvatar } from "../../../components/dw-avatar";
import { UserAvatar } from "../../../components/user-avatar";
import {
  type Notification,
  NotificationTypeSchema,
} from "../schemas/notification";
import {
  type NotificationCardAction,
  type NotificationCardView,
} from "../types/card-view";

export type { NotificationCardView as CardView } from "../types/card-view";

// First non-empty string among the candidates, else undefined. The DW-action
// payload sends both `agentInstanceIconUrl` (absolute CDN URL) and
// `agentInstanceIconUri` (relative path); prefer the URL but fall through an
// EMPTY string to the URI (nullish `??` wouldn't, since "" is not nullish).
function firstNonEmpty(
  ...candidates: (string | undefined)[]
): string | undefined {
  return candidates.find((c) => c !== undefined && c.length > 0);
}

// Interpolated card copy — module-scope `msg()` descriptors resolved with
// `i18n._()` at call time. The hook `t` descriptor form doesn't accept a
// `values` field, so interpolated strings use this pattern (same as the rest of
// the codebase); `useNotificationCardView` still calls `useLingui()` to
// re-render on a locale switch, which re-runs these `i18n._()` reads.
const DELIVERABLE_SHARED_BODY = msg({
  id: "notifications.deliverableShared.body",
  message: "Shared {fileName} to {projectName}.",
});
const DW_DISMISSED_BODY = msg({
  id: "notifications.dwDismissed.body",
  message: "Your Digital Worker {dwName} has been dismissed.",
});
const DW_REASSIGNED_TO_YOU = msg({
  id: "notifications.dwReassigned.toYou",
  message: "{dwName} has been assigned to you by Admin.",
});
const DW_REASSIGNED_TO_OTHER = msg({
  id: "notifications.dwReassigned.toOther",
  message: "{dwName} has been assigned to another operator by Admin.",
});
const MEMBER_INVITATION_BODY = msg({
  id: "notifications.memberInvitation.body",
  message: "You have been invited to join {projectName}.",
});
const MEMBER_REMOVED_BODY = msg({
  id: "notifications.memberRemoved.body",
  message: "You have been removed from {projectName}.",
});
const ROLE_CHANGED_BODY = msg({
  id: "notifications.roleChanged.body",
  message: "Your role in {projectName} has been changed to {roleLabel}.",
});
const NEUTRAL_BY = msg({
  id: "notifications.neutral.by",
  message: "By {senderUsername}",
});

function iconAvatar(children: ReactNode): ReactElement {
  return (
    <span className="bg-surface-sunken flex size-8 shrink-0 items-center justify-center rounded-full">
      {children}
    </span>
  );
}

// A person row's photo avatar — the employer's icon (legacy uses the employer
// avatar even on the review card). Falls back to name initials.
function personAvatar(name: string, iconUri: string | undefined): ReactNode {
  return <UserAvatar user={{ name, iconUri }} size="default" decorative />;
}

// A DW row's avatar. The wire sends both `agentInstanceIconUrl` (absolute CDN
// URL) and `agentInstanceIconUri` (relative path); prefer the URL, fall back to
// the URI. Both currently arrive empty, so DwAvatar shows its default DW glyph.
// Shared by the dismiss and reassign cards (byte-identical before extraction).
function dwLeading(
  dwAction:
    | { agentInstanceIconUrl?: string; agentInstanceIconUri?: string }
    | null
    | undefined,
): ReactNode {
  return (
    <DwAvatar
      agent={{
        iconUri: firstNonEmpty(
          dwAction?.agentInstanceIconUrl,
          dwAction?.agentInstanceIconUri,
        ),
      }}
      size="default"
      decorative
    />
  );
}

// Wraps a navigation thunk into a NotificationCardAction, gated on a usable project id: a
// positive id makes the whole row clickable; 0 / absent (the approval-row
// sentinel) leaves it read-only. Collapses the ternary the project cards
// repeated verbatim.
function projectNavAction(
  projectId: number | null | undefined,
  onClick: () => void,
): NotificationCardAction {
  return typeof projectId === "number" && projectId > 0
    ? { kind: "card", onClick }
    : { kind: "none" };
}

// Maps a notification to its display + navigation. Returns null for types we
// don't surface (e.g. reject / train-start), matching legacy's card coverage.
// eslint-disable-next-line max-lines-per-function -- flat per-type switch; extraction into per-type view builders tracked in #422.
export function useNotificationCardView(
  notification: Notification,
): NotificationCardView | null {
  const { t } = useLingui();
  const navigate = useNavigate();
  const { type, content, senderUsername, extraInfo } = notification;
  // Shared fallbacks — declared once as plain `t()` calls so the extractor sees
  // them (a `t()` nested inside another `t()`'s `values` is invisible to it).
  const someone = t({
    id: "notifications.fallback.someone",
    message: "Someone",
  });
  const aFile = t({ id: "notifications.fallback.aFile", message: "a file" });
  const aProject = t({
    id: "notifications.fallback.aProject",
    message: "a project",
  });

  switch (type) {
    case NotificationTypeSchema.enum.DELIVERABLE_SHARED: {
      // "Shared {file} to {project}." — the sender's avatar, whole-card click
      // jumps to the shared file's full-page preview. The deliverable payload
      // sits in `extraInfo.deliverable`; the owning project id is top-level.
      const deliverable = extraInfo?.deliverable;
      const deliverableId = deliverable?.deliverableId;
      const sharedProjectId = notification.projectId;
      // Both ids must be present AND positive — `0` is the schema's
      // approval-row sentinel (same guard `projectNavAction` applies), so a
      // `projectId: 0` row must stay read-only, not link to `/project/0/…`.
      // Inlined (not via `projectNavAction`) because this case navigates with
      // two ids, which the single-id helper doesn't cover.
      const canOpen =
        deliverableId !== undefined &&
        deliverableId > 0 &&
        typeof sharedProjectId === "number" &&
        sharedProjectId > 0;
      return {
        leading: personAvatar(senderUsername || someone, undefined),
        title: senderUsername || someone,
        body: i18n._(
          DELIVERABLE_SHARED_BODY.id,
          {
            fileName: deliverable?.fileName ?? aFile,
            projectName: deliverable?.projectName ?? aProject,
          },
          DELIVERABLE_SHARED_BODY,
        ),
        action: canOpen
          ? {
              kind: "card",
              onClick: () => {
                void navigate({
                  to: "/project/$projectId/deliverable/$assetId",
                  params: {
                    projectId: String(sharedProjectId),
                    assetId: String(deliverableId),
                  },
                  // Tell the asset-detail Back button this was opened from a
                  // notification, so it returns to the owning project page
                  // instead of history.back() (which would land on whatever
                  // page preceded the notification click). The shared
                  // useAssetDetailBack hook reads this state defensively.
                  // @ts-expect-error -- shared is app-agnostic and doesn't
                  // augment TanStack's HistoryState; the read side treats
                  // location.state as `unknown`, so this custom key is safe.
                  state: { fromNotification: true },
                });
              },
            }
          : { kind: "none" },
      };
    }
    case NotificationTypeSchema.enum.DW_DISMISSED: {
      // "Your Digital Worker {name} has been dismissed." The DW itself is gone,
      // so the row can't open it. Land on the project's Team → Digital workers
      // tab (per the notification spec). No projectId → not clickable.
      const dwName =
        extraInfo?.dwAction?.agentInstanceName ??
        t({
          id: "notifications.fallback.yourDw",
          message: "your Digital Worker",
        });
      const dismissProjectId = notification.projectId;
      return {
        leading: dwLeading(extraInfo?.dwAction),
        title: t({
          id: "notifications.dwDismissed.title",
          message: "Digital Worker dismissed",
        }),
        body: i18n._(DW_DISMISSED_BODY.id, { dwName }, DW_DISMISSED_BODY),
        action: projectNavAction(dismissProjectId, () => {
          void navigate({
            to: "/project/$projectId/team/digital-workers",
            params: { projectId: String(dismissProjectId) },
          });
        }),
      };
    }
    case NotificationTypeSchema.enum.DW_REASSIGNED: {
      // The same type reaches both operators. Both land on the project's Team →
      // Digital workers tab (per the notification spec); the body copy still
      // differs by whether the current user is the new operator. No projectId →
      // not clickable.
      const dwAction = extraInfo?.dwAction;
      const dwName =
        dwAction?.agentInstanceName ??
        t({ id: "notifications.fallback.aDw", message: "A Digital Worker" });
      const reassignProjectId = notification.projectId;
      const isNewOperator =
        Boolean(dwAction?.newOperatorUsername) &&
        notification.receiverUsername === dwAction?.newOperatorUsername;
      return {
        leading: dwLeading(dwAction),
        title: t({
          id: "notifications.dwReassigned.title",
          message: "Digital Worker reassigned",
        }),
        body: isNewOperator
          ? i18n._(DW_REASSIGNED_TO_YOU.id, { dwName }, DW_REASSIGNED_TO_YOU)
          : i18n._(
              DW_REASSIGNED_TO_OTHER.id,
              { dwName },
              DW_REASSIGNED_TO_OTHER,
            ),
        action: projectNavAction(reassignProjectId, () => {
          void navigate({
            to: "/project/$projectId/team/digital-workers",
            params: { projectId: String(reassignProjectId) },
          });
        }),
      };
    }
    case NotificationTypeSchema.enum.MEMBER_INVITATION: {
      // "You have been invited to join {project}." Clicking opens the project
      // (you're a member now).
      const project = extraInfo?.roleChange?.project;
      const projectName = project?.name ?? aProject;
      // Prefer the top-level projectId (always present on the wire) over the
      // nested project.id, which can be absent when roleChange.project doesn't
      // parse. `> 0` guards the 0 sentinel (approval rows).
      const invitedProjectId = project?.id ?? notification.projectId;
      return {
        // The sender (the admin who invited you); no iconUri in the payload, so
        // UserAvatar renders their initials.
        leading: personAvatar(senderUsername || someone, undefined),
        title: t({
          id: "notifications.memberInvitation.title",
          message: "Project invitation",
        }),
        body: i18n._(
          MEMBER_INVITATION_BODY.id,
          { projectName },
          MEMBER_INVITATION_BODY,
        ),
        action: projectNavAction(invitedProjectId, () => {
          void navigate({
            to: "/project/$projectId",
            params: { projectId: String(invitedProjectId) },
          });
        }),
      };
    }
    case NotificationTypeSchema.enum.MEMBER_REMOVED: {
      // "You have been removed from {project}." You're no longer in it, so the
      // row opens the project LIST (not the project itself).
      const projectName = extraInfo?.roleChange?.project?.name ?? aProject;
      return {
        // The sender (the admin who removed you); initials fallback, no icon.
        leading: personAvatar(senderUsername || someone, undefined),
        title: t({
          id: "notifications.memberRemoved.title",
          message: "Removed from project",
        }),
        body: i18n._(
          MEMBER_REMOVED_BODY.id,
          { projectName },
          MEMBER_REMOVED_BODY,
        ),
        action: {
          kind: "card",
          onClick: () => {
            void navigate({ to: "/project" });
          },
        },
      };
    }
    case NotificationTypeSchema.enum.SCHEDULED_TASK_FINISHED:
      return scheduledTaskNotificationView(
        notification,
        (agentId, conversationId) => {
          void navigate({
            to: "/digital-worker/$agentId/collaboration/$conversationId",
            params: {
              agentId: String(agentId),
              conversationId: String(conversationId),
            },
          });
        },
      );
    case NotificationTypeSchema.enum.PROJECT_ROLE_CHANGED: {
      // "Your role in {project} has been changed to Admin/Member." Clicking
      // opens the project's team/operators tab.
      const roleChange = extraInfo?.roleChange;
      const projectName = roleChange?.project?.name ?? aProject;
      // Prefer the top-level projectId over the nested project.id (see the
      // invitation handler); `> 0` guards the 0 sentinel.
      const roleProjectId = roleChange?.project?.id ?? notification.projectId;
      // The label is the RESULTING role, which `action` determines — the wire
      // sends `roleCode: project_admin` for every role change and encodes the
      // direction in `action` (1 = assigned admin → Admin; 2 = removed admin →
      // demoted to the member base → Member). Keying on roleCode alone showed
      // "Admin" even for a demote-to-member.
      const roleLabel =
        roleChange?.action === 2
          ? t({ id: "notifications.role.member", message: "Member" })
          : t({ id: "notifications.role.admin", message: "Admin" });
      return {
        // The sender (the admin who changed your role); initials fallback.
        leading: personAvatar(senderUsername || someone, undefined),
        title: t({
          id: "notifications.roleChanged.title",
          message: "Role changed",
        }),
        body: i18n._(
          ROLE_CHANGED_BODY.id,
          { projectName, roleLabel },
          ROLE_CHANGED_BODY,
        ),
        action: projectNavAction(roleProjectId, () => {
          void navigate({
            to: "/project/$projectId/team/operators",
            params: { projectId: String(roleProjectId) },
          });
        }),
      };
    }
    default: {
      // Reject / train-start / unknown — render as a neutral file row rather
      // than dropping it, so nothing silently disappears from the feed.
      if (!content) {
        return null;
      }
      return {
        leading: iconAvatar(
          <FileText className="text-foreground-tertiary size-4" aria-hidden />,
        ),
        title: content,
        body: senderUsername
          ? i18n._(NEUTRAL_BY.id, { senderUsername }, NEUTRAL_BY)
          : "",
        action: { kind: "none" },
      };
    }
  }
}
