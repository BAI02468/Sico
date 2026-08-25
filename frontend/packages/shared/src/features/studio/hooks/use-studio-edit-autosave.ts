import { useCallback, useEffect, useMemo } from "react";
import { type UseFormReturn, useWatch } from "react-hook-form";

import {
  type LatestSaveQueue,
  useLatestSaveQueue,
} from "../../../hooks/use-latest-save-queue";
import type { SetupBasicInfoValues } from "../../skill/components/setup/setup-basic-info-values";

function normalizeValues(name: string, role: string): SetupBasicInfoValues {
  return { name: name.trim(), role: role.trim() };
}

function acknowledgeValues(
  form: UseFormReturn<SetupBasicInfoValues>,
  values: SetupBasicInfoValues,
): void {
  const live = form.getValues();
  const current = normalizeValues(live.name, live.role);
  form.reset(values);
  if (current.name !== values.name || current.role !== values.role) {
    form.setValue("name", live.name, {
      shouldDirty: current.name !== values.name,
    });
    form.setValue("role", live.role, {
      shouldDirty: current.role !== values.role,
    });
  }
}

function useBasicInfoQueue(
  form: UseFormReturn<SetupBasicInfoValues>,
  onSave: (values: SetupBasicInfoValues) => Promise<string | void>,
): LatestSaveQueue<SetupBasicInfoValues> {
  return useLatestSaveQueue<SetupBasicInfoValues>({
    equals: (left, right) =>
      left.name === right.name && left.role === right.role,
    save: async (values) => {
      await onSave(values);
    },
    onSuccess: (values) => acknowledgeValues(form, values),
  });
}

function useScheduleBasicAutosave({
  enabled,
  valid,
  dirty,
  snapshot,
  queue,
}: {
  enabled: boolean;
  valid: boolean;
  dirty: boolean;
  snapshot: SetupBasicInfoValues;
  queue: LatestSaveQueue<SetupBasicInfoValues>;
}): void {
  const { cancelPending, schedule, status } = queue;
  useEffect(() => {
    if (!enabled) {
      cancelPending();
      return;
    }
    if (!valid) {
      cancelPending();
      return;
    }
    if (dirty || status === "saving") {
      schedule(snapshot);
    } else if (status !== "idle" && status !== "saved") {
      cancelPending();
    }
  }, [cancelPending, dirty, enabled, schedule, snapshot, status, valid]);
}

type StudioEditAutosave = Omit<
  LatestSaveQueue<SetupBasicInfoValues>,
  "flush" | "hasUnsettled"
> & {
  valid: boolean;
  hasUnsettled: boolean;
  flush: () => Promise<boolean>;
};

export function useStudioEditAutosave({
  form,
  enabled,
  onSave,
}: {
  form: UseFormReturn<SetupBasicInfoValues>;
  enabled: boolean;
  onSave: (values: SetupBasicInfoValues) => Promise<string | void>;
}): StudioEditAutosave {
  const [name, role] = useWatch({
    control: form.control,
    name: ["name", "role"],
  });
  const snapshot = useMemo(() => normalizeValues(name, role), [name, role]);
  const valid = snapshot.name.length > 0 && snapshot.role.length > 0;
  const queue = useBasicInfoQueue(form, onSave);

  useScheduleBasicAutosave({
    enabled,
    valid,
    dirty: form.formState.isDirty,
    snapshot,
    queue,
  });
  const { flush: flushQueue, schedule } = queue;

  const flush = useCallback(async (): Promise<boolean> => {
    if (!enabled) {
      return true;
    }
    if (!valid) {
      return false;
    }
    if (form.formState.isDirty) {
      schedule(snapshot);
    }
    return flushQueue();
  }, [enabled, flushQueue, form.formState.isDirty, schedule, snapshot, valid]);

  return {
    ...queue,
    valid,
    hasUnsettled: form.formState.isDirty || queue.hasUnsettled,
    flush,
  };
}
