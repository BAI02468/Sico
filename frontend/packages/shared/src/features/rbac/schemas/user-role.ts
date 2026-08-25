import { z } from "zod";

// Project- and organization-scoped roles are separate wire contracts. Keeping
// the closed sets distinct prevents a role from being sent with the wrong scope.
export const ProjectRoleCodeSchema = z.enum([
  "project_admin",
  "project_member",
]);
export type ProjectRoleCode = z.infer<typeof ProjectRoleCodeSchema>;

export const OrganizationRoleCodeSchema = z.enum([
  "org_admin",
  "developer",
  "org_member",
]);
export type OrganizationRoleCode = z.infer<typeof OrganizationRoleCodeSchema>;

export const AgentRoleCodeSchema = z.enum(["agent_editor"]);
export type AgentRoleCode = z.infer<typeof AgentRoleCodeSchema>;

export type ScopedRoleCode =
  | AgentRoleCode
  | OrganizationRoleCode
  | ProjectRoleCode;

// A user summary as embedded in RBAC responses. `alias`/`iconUri` are optional
// display fields the backend may omit or send empty.
export const rbacUserSchema = z.object({
  id: z.number().int(),
  email: z.string().email(),
  username: z.string().optional(),
  alias: z.string().optional(),
  iconUri: z.string().optional(),
  // Per-user last-touch time; the Team table's LAST ACTIVE reads this so each
  // row shows the member's own time instead of the shared project fallback.
  // Backend sends epoch SECONDS here (vs project detail's ms) — the formatter
  // normalizes by magnitude. Optional: absent for a member → row falls back.
  createdAt: z.number().int().optional(),
  updatedAt: z.number().int().optional(),
});
export type RbacUser = z.infer<typeof rbacUserSchema>;

// A single role grant: a role code scoped to a resource (`scopeType`+`scopeId`)
// for a user. `roleCode` is a bare string, NOT `ProjectRoleCodeSchema`: a user's role
// list spans every scope (platform/org/project) and carries codes we don't
// model (`platform_admin`, `org_admin`, `""`), so narrowing here would reject
// the whole list. Callers match the project codes by string. `scopeType`/
// `scopeId` are tolerated (default `""`/`0`) for the same reason — a non-project
// grant that omits them must not nuke the whole list. Numeric scope IDs arrive
// as strings on the wire (e.g. `"80"`) and must remain safe numbers for
// organization/project maps; agent scopes use UUIDs and must remain strings.
// The embedded `user` is present on `user_roles` listings but may be `null`.
const numericScopeIdSchema = z.preprocess(
  (value) =>
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value,
  z.number().int().safe(),
);

export const userRoleSchema = z.object({
  roleCode: z.string(),
  scopeType: z.string().catch(""),
  scopeId: z.union([numericScopeIdSchema, z.string().uuid()]).catch(0),
  userId: z.number().int(),
  user: rbacUserSchema.nullish(),
});
export type UserRole = z.infer<typeof userRoleSchema>;
