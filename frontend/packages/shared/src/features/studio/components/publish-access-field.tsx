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
import type { ReactElement } from "react";

import {
  type PublishAccess,
  PublishAccessSchema,
} from "../schemas/publish-single-agent";

export function PublishAccessField({
  access,
  pending,
  onChange,
}: {
  access: PublishAccess;
  pending: boolean;
  onChange: (access: PublishAccess) => void;
}): ReactElement {
  const { t } = useLingui();
  const accessItems = [
    {
      value: "only_me",
      label: t({ id: "studio.publishDialog.onlyMe", message: "Only me" }),
    },
    {
      value: "organization",
      label: t({
        id: "studio.publishDialog.organization",
        message: "My organization",
      }),
    },
  ] as const;
  return (
    <Field>
      <FieldLabel className="text-xs font-semibold tracking-wider uppercase">
        {t({ id: "studio.publishDialog.access", message: "Access" })}
      </FieldLabel>
      <Select
        items={accessItems}
        value={access}
        disabled={pending}
        onValueChange={(value) => onChange(PublishAccessSchema.parse(value))}
      >
        <SelectTrigger
          className="w-full"
          aria-label={t({
            id: "studio.publishDialog.access",
            message: "Access",
          })}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectItem value="only_me" className="h-16 items-start">
            <span className="flex flex-col items-start">
              <span>
                {t({ id: "studio.publishDialog.onlyMe", message: "Only me" })}
              </span>
              <span className="text-foreground-tertiary text-xs">
                {t({
                  id: "studio.publishDialog.onlyMeDescription",
                  message:
                    "Only you and invited editors can view and edit this digital worker.",
                })}
              </span>
            </span>
          </SelectItem>
          <SelectItem value="organization" className="h-16 items-start">
            <span className="flex flex-col items-start">
              <span>
                {t({
                  id: "studio.publishDialog.organization",
                  message: "My organization",
                })}
              </span>
              <span className="text-foreground-tertiary text-xs">
                {t({
                  id: "studio.publishDialog.organizationDescription",
                  message:
                    "Anyone in your organization can add and use this digital worker.",
                })}
              </span>
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </Field>
  );
}
