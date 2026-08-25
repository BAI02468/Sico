import { useLingui } from "@lingui/react/macro";
import { FieldGroup } from "@sico/ui";
import { type JSX } from "react";
import { type Control } from "react-hook-form";

import { CreateStudioAgentDialogOrganizationStatus } from "./create-studio-agent-dialog-organization-status";
import { type LoadState } from "../../digital-worker/utils/load-state";
import { type SetupBasicInfoValues } from "../../skill/components/setup/setup-basic-info-values";
import { SetupNameField } from "../../skill/components/setup/setup-name-field";
import { SetupRoleField } from "../../skill/components/setup/setup-role-field";
import { type Role } from "../../skill/schemas/roles";

type Props = {
  control: Control<SetupBasicInfoValues>;
  roles: Role[];
  rolesState: LoadState;
  organizationState: LoadState;
  roleDisabled: boolean;
  nameDisabled: boolean;
  onRetryRoles: () => void;
  onRetryOrganization: () => void;
};

function useRolesPlaceholder(state: LoadState): string {
  const { t } = useLingui();
  if (state === "loading") {
    return t({
      id: "studio.createDialog.rolesLoading",
      message: "Loading roles…",
    });
  }
  if (state === "error") {
    return t({
      id: "studio.createDialog.rolesLoadFailed",
      message: "Couldn't load roles",
    });
  }
  if (state === "empty") {
    return t({
      id: "studio.createDialog.rolesEmpty",
      message: "No roles available",
    });
  }
  return t({ id: "skill.roleSelect.placeholder", message: "Select a role..." });
}

export function CreateStudioAgentDialogFields({
  control,
  roles,
  rolesState,
  organizationState,
  roleDisabled,
  nameDisabled,
  onRetryRoles,
  onRetryOrganization,
}: Props): JSX.Element {
  const { t } = useLingui();
  const rolesPlaceholder = useRolesPlaceholder(rolesState);
  return (
    <FieldGroup>
      <SetupRoleField
        control={control}
        roleOptions={roles}
        disabled={roleDisabled}
        placeholder={rolesPlaceholder}
        loadError={
          rolesState === "error"
            ? t({
                id: "studio.createDialog.rolesLoadError",
                message: "We couldn't load roles.",
              })
            : undefined
        }
        onRetry={rolesState === "error" ? onRetryRoles : undefined}
      />
      <SetupNameField
        control={control}
        disabled={nameDisabled}
        placeholder={t({
          id: "studio.createDialog.roleNamePlaceholder",
          message: "e.g. software tester",
        })}
      />
      <CreateStudioAgentDialogOrganizationStatus
        state={organizationState}
        onRetry={onRetryOrganization}
      />
    </FieldGroup>
  );
}
