import { z } from "zod";

import { ProjectRoleCodeSchema, rbacUserSchema } from "../../rbac";

export const projectMemberSchema = rbacUserSchema.extend({
  roleCode: ProjectRoleCodeSchema,
});
export type ProjectMember = z.infer<typeof projectMemberSchema>;
