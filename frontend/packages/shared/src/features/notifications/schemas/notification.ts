import { z } from "zod";

import { PlanStatusSchema } from "../../../schemas/plan-status";

// Notification wire contract (legacy dwp `notification` API). Enums are wire
// integers modelled as `z.enum` (TS `enum` is banned) — access via
// `NotificationStatus.enum.UNREAD`. Rebuilt natively here; sico ships no
// notification logic (it only owns the sidebar header slot).

export const NotificationStatusSchema = z.enum({
  READ: 1,
  UNREAD: 2,
});
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;

export const NotificationTypeSchema = z.enum({
  EMPLOYER_ONBOARD_REJECT: 3,
  TRAIN_TASK_START: 4,
  // A deliverable was published into a project ("Add to project" from a
  // deliverable preview). Confirmed against the live wire: type 7.
  DELIVERABLE_SHARED: 7,
  // The DW owner's Digital Worker was dismissed. Payload in extraInfo.dwAction.
  DW_DISMISSED: 8,
  // A Digital Worker was reassigned between operators by an admin. The same
  // type reaches both the NEW operator ("assigned to you") and the PREVIOUS
  // operator ("assigned to another operator") — the card branches on whether
  // the current user is the new operator. Payload in extraInfo.dwAction.
  DW_REASSIGNED: 9,
  // Project membership + role notifications (rbac). All three carry
  // extraInfo.roleChange (project digest + roleCode + action).
  MEMBER_INVITATION: 10, // "invited to join {project}"
  MEMBER_REMOVED: 11, // "removed from {project}"
  PROJECT_ROLE_CHANGED: 12, // "role in {project} changed to Admin/Member"
  SCHEDULED_TASK_FINISHED: 15,
});
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

// Wire type ints dwp no longer surfaces: employer-onboard-request (1),
// operator-onboard-review (2), train-task succeed/fail (5/6) — their target
// pages (my-team / onboarding wizard / training-task) were removed. Filtered at
// the RAW layer in `useNotifications` before parse: after parse an unknown
// `type` collapses to undefined and can't be told apart from a genuinely-new
// wire type, so the drop has to happen while the raw int is still visible.
export const REMOVED_NOTIFICATION_TYPES = new Set([1, 2, 5, 6]);
// against the live wire: `extraInfo.deliverable`, with the owning project's id
// at the notification's TOP level (`projectId`), not in here. `deliverableId`
// targets the full-page preview route; `fileName`/`projectName` drive the copy.
const deliverableSchema = z
  .object({
    deliverableId: z.number().int(),
    fileName: z.string(),
    fileUri: z.string(),
    agentInstanceId: z.number().int(),
    agentInstanceName: z.string(),
    projectName: z.string(),
  })
  .partial()
  .nullish();

// DW dismiss / reassign payload (`NotificationExtraInfoDwAction`). The card
// reads the DW name for the copy; reassign additionally branches on
// old/newOperatorUsername to pick the "assigned to you" vs "assigned to another
// operator" wording. `projectName` is shown when present.
const dwActionSchema = z
  .object({
    agentInstanceId: z.number().int(),
    agentInstanceName: z.string(),
    projectName: z.string(),
    oldOperatorUsername: z.string(),
    newOperatorUsername: z.string(),
    // DW avatar source for the card. The wire sends two fields:
    // `agentInstanceIconUrl` (absolute CDN URL) and `agentInstanceIconUri`
    // (relative path); the card prefers the URL, falls back to the URI. Both
    // currently arrive empty, so DwAvatar shows the default DW glyph — declared
    // here so a backend that populates them renders the real avatar.
    agentInstanceIconUrl: z.string(),
    agentInstanceIconUri: z.string(),
  })
  .partial()
  .nullish();

// Project membership + role notifications (`NotificationExtraInfoRoleChange`):
// invitation (10), removed (11), role changed (12). `project` is the
// ProjectDigest (id + name) used for the copy and navigation; `roleCode`
// (project_admin / project_member) drives the "Admin" / "Member" label on the
// role-changed card. `action` is a numeric enum on the wire (1 = assigned,
// 2 = removed) — the card keys wording on the notification `type`, not
// `action`, so it's tolerated but unused. It was declared `z.string()`, which
// REJECTED the numeric wire value and collapsed the whole `roleChange` (and via
// `extraInfo.catch(undefined)`, all of extraInfo) to undefined — so an
// invite-as-admin lost its roleCode and mis-rendered as "changed to Member".
const roleChangeSchema = z
  .object({
    project: z
      .object({ id: z.number().int(), name: z.string() })
      .partial()
      .nullish(),
    roleCode: z.string(),
    action: z.number().int().catch(0),
  })
  .partial()
  .nullish();

const scheduledTaskFinishedSchema = z
  .object({
    task: z
      .object({
        id: z.number().int().positive().catch(0),
        title: z.string().catch(""),
      })
      .partial()
      .nullish(),
    status: PlanStatusSchema.optional().catch(undefined),
    scheduledTaskRunId: z.number().int().nonnegative().catch(0),
    conversationId: z.number().int().nonnegative().optional().catch(undefined),
    agentInstance: z
      .object({
        id: z.number().int().positive().catch(0),
        agentName: z.string().catch(""),
        agentIconUrl: z.string().catch(""),
        operatorUsername: z.string().catch(""),
      })
      .partial()
      .nullish(),
    scheduledFor: z.number().int().nonnegative().catch(0),
  })
  .partial()
  .nullish();

export const notificationSchema = z.object({
  id: z.number().int(),
  content: z.string().catch(""),
  senderUsername: z.string().catch(""),
  // The recipient of THIS notification row. DW-reassign sends the same type to
  // both operators; the card compares this against `newOperatorUsername` to
  // pick the "assigned to you" vs "assigned to another operator" wording.
  receiverUsername: z.string().catch(""),
  createdAt: z.number().int().nonnegative().catch(0),
  updatedAt: z.number().int().nonnegative().catch(0),
  // Unknown status/type ints degrade to undefined so one bad row never nukes
  // the whole list parse (display-only resilience).
  status: NotificationStatusSchema.nullish().catch(undefined),
  type: NotificationTypeSchema.nullish().catch(undefined),
  // Owning project id, top-level on the wire (the deliverable-shared card reads
  // it to navigate). 0 / absent → no project (e.g. agent-request rows).
  projectId: z.number().int().nonnegative().nullish().catch(undefined),
  extraInfo: z
    .object({
      deliverable: deliverableSchema,
      dwAction: dwActionSchema,
      roleChange: roleChangeSchema,
      scheduledTaskFinished: scheduledTaskFinishedSchema,
    })
    .partial()
    .nullish()
    .catch(undefined),
});
export type Notification = z.infer<typeof notificationSchema>;
