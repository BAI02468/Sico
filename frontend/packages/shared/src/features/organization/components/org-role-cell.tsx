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

import {
  type OrganizationRoleCode,
  OrganizationRoleCodeSchema,
} from "../../rbac/schemas/user-role";
import { useOrganizationRoleLabels } from "../hooks/use-organization-role-labels";

export function OrgRoleCell({
  role,
  disabled,
  onChangeRole,
}: {
  role: OrganizationRoleCode;
  disabled?: boolean;
  onChangeRole: (next: OrganizationRoleCode) => void;
}): React.JSX.Element {
  const { t } = useLingui();
  const labels = useOrganizationRoleLabels();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        render={
          <Button
            variant="link"
            aria-label={t({
              id: "organization.members.changeRole",
              message: "Change role",
            })}
            className="text-foreground-secondary hover:text-foreground-primary h-auto gap-1 p-0 text-sm font-normal"
          />
        }
      >
        {labels[role]}
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="!w-40">
        <DropdownMenuRadioGroup
          value={role}
          onValueChange={(value) =>
            onChangeRole(OrganizationRoleCodeSchema.parse(value))
          }
        >
          {OrganizationRoleCodeSchema.options.map((code) => (
            <DropdownMenuRadioItem key={code} value={code} closeOnClick>
              {labels[code]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
