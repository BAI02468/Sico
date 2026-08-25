import { useLingui } from "@lingui/react/macro";
import {
  Field,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@sico/ui";
import type * as React from "react";
import { type Control, Controller } from "react-hook-form";

import {
  type OrganizationRoleCode,
  OrganizationRoleCodeSchema,
} from "../../rbac/schemas/user-role";
import { useOrganizationRoleLabels } from "../hooks/use-organization-role-labels";

export type InviteRoleFieldValues = {
  email: string;
  role: OrganizationRoleCode;
};

export function InviteRoleField({
  control,
}: {
  control: Control<InviteRoleFieldValues>;
}): React.JSX.Element {
  const { t } = useLingui();
  const labels = useOrganizationRoleLabels();
  const items = OrganizationRoleCodeSchema.options.map((code) => ({
    value: code,
    label: labels[code],
  }));
  const descriptions: Record<OrganizationRoleCode, string> = {
    org_admin: t({
      id: "organization.invite.role.admin",
      message: "Can manage organization",
    }),
    org_member: t({
      id: "organization.invite.role.operator",
      message: "Can collaborate with digital workers",
    }),
    developer: t({
      id: "organization.invite.role.developer",
      message: "Can build new digital worker roles",
    }),
  };
  return (
    <Controller
      name="role"
      control={control}
      render={({ field }) => (
        <Field>
          <FieldLabel
            id="invite-org-role-label"
            className="text-xs font-semibold tracking-wider uppercase"
          >
            {t({ id: "organization.invite.roleLabel", message: "Role" })}
          </FieldLabel>
          <Select
            items={items}
            value={field.value}
            onValueChange={(next) =>
              field.onChange(OrganizationRoleCodeSchema.parse(next))
            }
          >
            <SelectTrigger
              id="invite-org-role"
              aria-labelledby="invite-org-role-label"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {OrganizationRoleCodeSchema.options.map((code) => (
                <SelectItem
                  key={code}
                  value={code}
                  className="h-auto items-start py-2 pl-3.5"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span>{labels[code]}</span>
                    <span className="text-foreground-tertiary text-xs leading-snug whitespace-normal">
                      {descriptions[code]}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    />
  );
}
