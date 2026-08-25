import { useLingui } from "@lingui/react/macro";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@sico/ui";
import { ChevronDown } from "lucide-react";
import type * as React from "react";

import { type ProjectMember } from "../../membership";
import {
  type ProjectRoleCode,
  ProjectRoleCodeSchema,
} from "../../rbac/schemas/user-role";
import { useRoleLabels } from "../hooks/use-role-labels";

export type HumanRoleCellProps = {
  isOwner: boolean;
  canManage: boolean;
  member: ProjectMember;
  onChangeRole: (next: ProjectRoleCode) => void;
};

/** The ROLE column content: a read-only "Owner" for the project owner (fixed for
 * everyone), an editable dropdown for an admin, or plain role text otherwise. */
export function HumanRoleCell({
  isOwner,
  canManage,
  member,
  onChangeRole,
}: HumanRoleCellProps): React.JSX.Element {
  const { t } = useLingui();
  const roleLabels = useRoleLabels();
  if (isOwner) {
    return (
      <span className="text-foreground-secondary text-sm">
        {t({ id: "team.humanRow.owner", message: "Owner" })}
      </span>
    );
  }
  if (!canManage) {
    return (
      <span className="text-foreground-secondary text-sm">
        {roleLabels[member.roleCode]}
      </span>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="link"
            aria-label={t({
              id: "team.humanRow.changeRole",
              message: "Change role",
            })}
            className="text-foreground-secondary hover:text-foreground-primary h-auto gap-1 p-0 text-sm font-normal"
          />
        }
      >
        {roleLabels[member.roleCode]}
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="!w-40">
        <DropdownMenuRadioGroup
          value={member.roleCode}
          onValueChange={(v) => onChangeRole(ProjectRoleCodeSchema.parse(v))}
        >
          {ProjectRoleCodeSchema.options.map((code) => (
            <DropdownMenuRadioItem key={code} value={code} closeOnClick>
              {roleLabels[code]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
