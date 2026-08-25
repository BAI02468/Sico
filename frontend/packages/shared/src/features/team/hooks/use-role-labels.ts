import { useLingui } from "@lingui/react/macro";

import { type ProjectRoleCode } from "../../rbac/schemas/user-role";

// The short members-context role labels (Team table + invite dialog),
// resolved via the subscribed hook `t` so lingui extracts the ids statically
// and they retranslate on a locale switch. Shared so the two consumers can't
// drift out of sync.
export function useRoleLabels(): Record<ProjectRoleCode, string> {
  const { t } = useLingui();
  return {
    project_admin: t({ id: "team.role.admin", message: "Admin" }),
    project_member: t({ id: "team.role.member", message: "Member" }),
  };
}
