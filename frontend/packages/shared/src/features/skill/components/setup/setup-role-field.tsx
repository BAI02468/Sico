import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Field, FieldError, FieldLabel } from "@sico/ui";
import { type ReactElement } from "react";
import { type Control, Controller } from "react-hook-form";

import { RoleSelect } from "./role-select";
import { type SetupBasicInfoValues } from "./setup-basic-info-values";
import type { Role } from "../../schemas/roles";

type Props = {
  control: Control<SetupBasicInfoValues>;
  roleOptions: Role[];
  disabled: boolean;
  placeholder?: string;
  loadError?: string;
  onRetry?: () => void;
};

export function SetupRoleField({
  control,
  roleOptions,
  disabled,
  placeholder,
  loadError,
  onRetry,
}: Props): ReactElement {
  const { t } = useLingui();
  const industryType = t({
    id: "skill.setupBasicInfo.role",
    message: "Industry Type",
  });
  return (
    <Controller
      name="role"
      control={control}
      render={({ field, fieldState }) => (
        <Field
          className="flex-1"
          data-invalid={fieldState.invalid || undefined}
        >
          <FieldLabel htmlFor="setup-role">
            <Trans id="skill.setupBasicInfo.role">Industry Type</Trans>
            <span aria-hidden="true">*</span>
          </FieldLabel>
          <RoleSelect
            id="setup-role"
            value={field.value}
            options={roleOptions}
            disabled={disabled}
            ariaLabel={industryType}
            ariaInvalid={fieldState.invalid}
            ariaRequired
            placeholder={placeholder}
            ref={field.ref}
            onChange={field.onChange}
            onBlur={field.onBlur}
          />
          {loadError ? (
            <FieldError className="flex items-center gap-2">
              <span>{loadError}</span>
              {onRetry ? (
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  onClick={onRetry}
                >
                  <Trans id="common.action.tryAgain">Try again</Trans>
                </Button>
              ) : null}
            </FieldError>
          ) : null}
          {fieldState.error?.message && (
            <FieldError>{fieldState.error.message}</FieldError>
          )}
        </Field>
      )}
    />
  );
}
