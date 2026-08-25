import { useLingui } from "@lingui/react/macro";

import { type OrganizationRoleCode } from "../../rbac/schemas/user-role";

export function useOrganizationRoleLabels(): Record<
  OrganizationRoleCode,
  string
> {
  const { t } = useLingui();
  return {
    org_admin: t({ id: "organization.role.admin", message: "Admin" }),
    org_member: t({ id: "organization.role.operator", message: "Operator" }),
    developer: t({
      id: "organization.role.developer",
      message: "Developer",
    }),
  };
}
