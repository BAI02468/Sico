import { act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SetupBasicInfoValues } from "@/features/skill/components/setup/setup-basic-info-values";
import { useStudioEditAutosave } from "@/features/studio/hooks/use-studio-edit-autosave";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useStudioEditAutosave", () => {
  it("cancels a scheduled write when the user reverts before debounce", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => {
      const form = useForm<SetupBasicInfoValues>({
        defaultValues: { name: "Max", role: "Researcher" },
      });
      return {
        form,
        autosave: useStudioEditAutosave({ form, enabled: true, onSave }),
      };
    });

    act(() => {
      result.current.form.setValue("name", "Changed", { shouldDirty: true });
    });
    act(() => {
      result.current.form.setValue("name", "Max", { shouldDirty: true });
    });
    await act(() => vi.advanceTimersByTimeAsync(600));

    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.autosave.hasUnsettled).toBe(false);
  });

  it("cancels a scheduled snapshot when editing becomes disabled", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ enabled }) => {
        const form = useForm<SetupBasicInfoValues>({
          defaultValues: { name: "Max", role: "Researcher" },
        });
        return {
          form,
          autosave: useStudioEditAutosave({ form, enabled, onSave }),
        };
      },
      { initialProps: { enabled: true } },
    );

    act(() => {
      result.current.form.setValue("name", "Changed", { shouldDirty: true });
    });
    rerender({ enabled: false });
    await act(() => vi.advanceTimersByTimeAsync(600));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("cancels a scheduled snapshot when the form becomes invalid", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => {
      const form = useForm<SetupBasicInfoValues>({
        defaultValues: { name: "Max", role: "Researcher" },
      });
      return {
        form,
        autosave: useStudioEditAutosave({ form, enabled: true, onSave }),
      };
    });

    act(() => {
      result.current.form.setValue("name", "Changed", { shouldDirty: true });
    });
    act(() => {
      result.current.form.setValue("name", "", { shouldDirty: true });
    });
    await act(() => vi.advanceTimersByTimeAsync(600));

    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.autosave.valid).toBe(false);
  });
});
