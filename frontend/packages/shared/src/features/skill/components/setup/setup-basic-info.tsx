import { useLingui } from "@lingui/react/macro";
import type { ReactElement } from "react";
import type { Control } from "react-hook-form";

import { type SetupBasicInfoValues } from "./setup-basic-info-values";
import { SetupNameField } from "./setup-name-field";
import { SetupRoleField } from "./setup-role-field";
import type { Role } from "../../schemas/roles";

export function SetupBasicInfo({
  control,
  roleOptions,
  creatorUsername,
  disabled,
}: {
  control: Control<SetupBasicInfoValues>;
  roleOptions: Role[];
  creatorUsername?: string;
  disabled: boolean;
}): ReactElement {
  const { t } = useLingui();
  return (
    <section
      className="flex w-full flex-col gap-4"
      aria-labelledby="setup-basic-info-title"
    >
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <h2
            id="setup-basic-info-title"
            className="text-foreground-primary text-base font-medium"
          >
            {t({
              id: "skill.setupBasicInfo.sectionTitle",
              message: "BASIC INFO",
            })}
          </h2>
          {creatorUsername ? (
            <p className="text-foreground-secondary text-sm">
              {t({
                id: "studio.setupEditor.createdBy",
                message: `Created by ${creatorUsername}`,
              })}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex items-start gap-4">
        <SetupNameField control={control} disabled={disabled} />
        <SetupRoleField
          control={control}
          roleOptions={roleOptions}
          disabled={disabled}
        />
      </div>
    </section>
  );
}
