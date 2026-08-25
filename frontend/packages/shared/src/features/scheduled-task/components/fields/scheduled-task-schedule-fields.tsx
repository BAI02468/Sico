import { useLingui } from "@lingui/react/macro";
import {
  Field,
  FieldError,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@sico/ui";
import { type JSX } from "react";
import { type Control, Controller, useWatch } from "react-hook-form";

import { FIELD_LABEL_CLASS } from "../../../../constants/form";
import { type ScheduledTaskFormValues } from "../../schemas/scheduled-task-form";

const times = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, "0");
  return `${hour}:${index % 2 === 0 ? "00" : "30"}`;
});

type Props = { control: Control<ScheduledTaskFormValues>; disabled: boolean };
type Copy = {
  frequency: string;
  daily: string;
  weekly: string;
  custom: string;
  time: string;
  dayOfWeek: string;
  scheduleConfiguration: string;
  customSchedule: string;
  weekdays: string[];
  locale: string;
};

function useCopy(): Copy {
  const { i18n, t } = useLingui();
  return {
    frequency: t({
      id: "scheduledTask.form.frequency.label",
      message: "Frequency",
    }),
    daily: t({ id: "scheduledTask.form.frequency.daily", message: "Daily" }),
    weekly: t({ id: "scheduledTask.form.frequency.weekly", message: "Weekly" }),
    custom: t({ id: "scheduledTask.form.frequency.custom", message: "Custom" }),
    time: t({ id: "scheduledTask.form.time.label", message: "Time" }),
    dayOfWeek: t({
      id: "scheduledTask.form.weekday.label",
      message: "Day of week",
    }),
    scheduleConfiguration: t({
      id: "scheduledTask.form.scheduleConfiguration.label",
      message: "Schedule configuration",
    }),
    customSchedule: t({
      id: "scheduledTask.form.customSchedule.label",
      message: "Custom schedule",
    }),
    weekdays: [
      t({ id: "scheduledTask.form.weekday.0", message: "Sunday" }),
      t({ id: "scheduledTask.form.weekday.1", message: "Monday" }),
      t({ id: "scheduledTask.form.weekday.2", message: "Tuesday" }),
      t({ id: "scheduledTask.form.weekday.3", message: "Wednesday" }),
      t({ id: "scheduledTask.form.weekday.4", message: "Thursday" }),
      t({ id: "scheduledTask.form.weekday.5", message: "Friday" }),
      t({ id: "scheduledTask.form.weekday.6", message: "Saturday" }),
    ],
    locale: i18n.locale,
  };
}

function formatTime(value: string, locale: string): string {
  const [hour, minute] = value.split(":");
  const formatted = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2026, 0, 1, Number(hour), Number(minute)));
  return locale === "en" && hour === "00"
    ? formatted.replace(/^12(?=:)/, "00")
    : formatted;
}

function frequencyField({ control, disabled }: Props, copy: Copy): JSX.Element {
  return (
    <Controller
      name="frequency"
      control={control}
      render={({ field }) => (
        <Field>
          <FieldLabel htmlFor="scheduled-task-frequency" className="sr-only">
            {copy.frequency}
          </FieldLabel>
          <Select
            items={[
              { value: "daily", label: copy.daily },
              { value: "weekly", label: copy.weekly },
              ...(field.value === "custom"
                ? [{ value: "custom", label: copy.custom }]
                : []),
            ]}
            value={field.value}
            onValueChange={(value) => {
              if (
                value === "daily" ||
                value === "weekly" ||
                value === "custom"
              ) {
                field.onChange(value);
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger id="scheduled-task-frequency" aria-required="true">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value="daily">{copy.daily}</SelectItem>
              <SelectItem value="weekly">{copy.weekly}</SelectItem>
              {field.value === "custom" ? (
                <SelectItem value="custom" disabled>
                  {copy.custom}
                </SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </Field>
      )}
    />
  );
}

function timeField({ control, disabled }: Props, copy: Copy): JSX.Element {
  return (
    <Controller
      name="time"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid ? true : undefined}>
          <FieldLabel htmlFor="scheduled-task-time" className="sr-only">
            {copy.time}
          </FieldLabel>
          <Select
            items={times.map((time) => ({
              value: time,
              label: formatTime(time, copy.locale),
            }))}
            value={field.value || null}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <SelectTrigger
              id="scheduled-task-time"
              aria-invalid={fieldState.invalid ? true : undefined}
              aria-required="true"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {times.map((time) => (
                <SelectItem
                  key={time}
                  value={time}
                  label={formatTime(time, copy.locale)}
                >
                  {formatTime(time, copy.locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldState.error?.message ? (
            <FieldError>{fieldState.error.message}</FieldError>
          ) : null}
        </Field>
      )}
    />
  );
}

function weekdayField({ control, disabled }: Props, copy: Copy): JSX.Element {
  return (
    <Controller
      name="weekday"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid ? true : undefined}>
          <FieldLabel htmlFor="scheduled-task-weekday" className="sr-only">
            {copy.dayOfWeek}
          </FieldLabel>
          <Select
            items={copy.weekdays.map((label, value) => ({
              value: String(value),
              label,
            }))}
            value={field.value === undefined ? null : String(field.value)}
            onValueChange={(value) =>
              field.onChange(value === null ? undefined : Number(value))
            }
            disabled={disabled}
          >
            <SelectTrigger
              id="scheduled-task-weekday"
              aria-invalid={fieldState.invalid ? true : undefined}
              aria-required="true"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {copy.weekdays.map((label, value) => (
                <SelectItem key={label} value={String(value)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldState.error?.message ? (
            <FieldError>{fieldState.error.message}</FieldError>
          ) : null}
        </Field>
      )}
    />
  );
}

export function ScheduledTaskScheduleFields({
  control,
  disabled,
}: Props): JSX.Element {
  const copy = useCopy();
  const frequency = useWatch({ control, name: "frequency" });
  const customCron = useWatch({ control, name: "originalCronExpression" });
  let fields: JSX.Element;
  if (frequency === "custom") {
    fields = (
      <div
        data-testid="scheduled-task-schedule-fields"
        className="grid grid-cols-2 gap-2"
      >
        {frequencyField({ control, disabled }, copy)}
        <Field>
          <FieldLabel htmlFor="scheduled-task-custom-cron" className="sr-only">
            {copy.customSchedule}
          </FieldLabel>
          <Input
            id="scheduled-task-custom-cron"
            value={customCron ?? ""}
            readOnly
          />
        </Field>
      </div>
    );
  } else {
    fields = (
      <div
        data-testid="scheduled-task-schedule-fields"
        className={
          frequency === "weekly"
            ? "grid grid-cols-3 gap-2"
            : "grid grid-cols-2 gap-2"
        }
      >
        {frequencyField({ control, disabled }, copy)}
        {frequency === "weekly"
          ? weekdayField({ control, disabled }, copy)
          : null}
        {timeField({ control, disabled }, copy)}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <p className={FIELD_LABEL_CLASS}>{copy.scheduleConfiguration}</p>
      {fields}
    </div>
  );
}
