import { useLingui } from "@lingui/react/macro";
import {
  Field,
  FieldError,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@sico/ui";
import type * as React from "react";
import { type Control, Controller } from "react-hook-form";

import { type AssignDeviceValues } from "./assign-device-fields";
import { FIELD_LABEL_CLASS } from "../../../constants/form";
import { type Agent } from "../../digital-worker/schemas/agent";

type DwFieldProps = {
  control: Control<AssignDeviceValues>;
  agents: Agent[];
  disabled: boolean;
  isPending: boolean;
};

export function DwField({
  control,
  agents,
  disabled,
  isPending,
}: DwFieldProps): React.JSX.Element {
  const { t } = useLingui();
  // Load failure is surfaced by the dialog as a toast; the placeholder only
  // distinguishes loading / empty / ready here.
  let placeholder = t({
    id: "sandboxDevices.assignDialog.placeholder.select",
    message: "Select a digital worker…",
  });
  if (isPending) {
    placeholder = t({
      id: "sandboxDevices.assignDialog.placeholder.loading",
      message: "Loading digital workers…",
    });
  } else if (agents.length === 0) {
    placeholder = t({
      id: "sandboxDevices.assignDialog.placeholder.empty",
      message: "No digital workers available",
    });
  }
  return (
    <Controller
      name="instanceId"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid ? true : undefined}>
          <FieldLabel htmlFor="assign-device-dw" className={FIELD_LABEL_CLASS}>
            {t({
              id: "sandboxDevices.assignDialog.workerLabel",
              message: "Digital Worker",
            })}
          </FieldLabel>
          <Select
            items={agents.map((agent) => ({
              value: String(agent.id),
              label: agent.name,
            }))}
            value={field.value || null}
            onValueChange={(next) => field.onChange(next ?? "")}
            disabled={disabled}
          >
            <SelectTrigger id="assign-device-dw" className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {agents.map((agent) => (
                <SelectItem
                  key={agent.id}
                  value={String(agent.id)}
                  label={agent.name}
                >
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldState.error?.message && (
            <FieldError>{fieldState.error.message}</FieldError>
          )}
        </Field>
      )}
    />
  );
}
