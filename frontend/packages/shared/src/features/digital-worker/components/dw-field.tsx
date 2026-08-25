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

import { type AddDwValues } from "./add-dw-fields";
import { StatusRow } from "./status-row";
import { FIELD_LABEL_CLASS } from "../../../constants/form";
import { type SingleAgentCard } from "../../studio/schemas/single-agent-card";
import { type LoadState, placeholderFor } from "../utils/load-state";

type DwFieldProps = {
  control: Control<AddDwValues>;
  templates: SingleAgentCard[];
  state: LoadState;
  onPick: (card: SingleAgentCard | undefined) => void;
};

export function DwField({
  control,
  templates,
  state,
  onPick,
}: DwFieldProps): React.JSX.Element {
  const { t } = useLingui();
  const placeholder = placeholderFor(
    state,
    t({
      id: "digitalWorker.addDialog.workerPlaceholder",
      message: "Select a digital worker…",
    }),
    t({
      id: "digitalWorker.addDialog.workersNoun",
      message: "digital workers",
    }),
  );
  return (
    <Controller
      name="agentId"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid ? true : undefined}>
          <FieldLabel htmlFor="add-dw-template" className={FIELD_LABEL_CLASS}>
            {t({
              id: "digitalWorker.addDialog.workerLabel",
              message: "Digital worker",
            })}
          </FieldLabel>
          <Select
            value={field.value || null}
            onValueChange={(next) => {
              field.onChange(next ?? "");
              onPick(templates.find((template) => template.agentId === next));
            }}
            disabled={state === "loading" || state === "error"}
          >
            <SelectTrigger id="add-dw-template" className="w-full">
              <SelectValue placeholder={placeholder}>
                {(value: string | null) => {
                  const card = templates.find(
                    (template) => template.agentId === value,
                  );
                  return card ? card.name : placeholder;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              className="scrollbar max-h-[min(var(--available-height),--spacing(85))]"
            >
              {state === "empty" ? (
                <StatusRow>
                  {t({
                    id: "digitalWorker.addDialog.workersEmpty",
                    message: "No digital workers available yet.",
                  })}
                </StatusRow>
              ) : (
                templates.map((card) => (
                  <SelectItem
                    key={card.agentId}
                    value={card.agentId}
                    label={card.name}
                    className="h-auto items-start py-2"
                  >
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-foreground-primary text-sm font-medium">
                        {card.name}
                      </span>
                      {card.role ? (
                        <span className="text-foreground-tertiary text-xs leading-snug whitespace-normal">
                          {card.role}
                        </span>
                      ) : null}
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {state === "error" && (
            <FieldError>
              {t({
                id: "digitalWorker.addDialog.workersLoadError",
                message:
                  "Couldn't load digital workers. Try reopening the dialog.",
              })}
            </FieldError>
          )}
          {fieldState.error?.message && (
            <FieldError>{fieldState.error.message}</FieldError>
          )}
        </Field>
      )}
    />
  );
}
