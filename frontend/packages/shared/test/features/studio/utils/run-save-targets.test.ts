import { describe, expect, it, vi } from "vitest";

import { runSaveTargets } from "@/features/studio/utils/run-save-targets";

function target(
  id: string,
  save: () => Promise<void>,
): { id: string; save: () => Promise<void> } {
  return { id, save };
}

describe("runSaveTargets", () => {
  it("keeps only failed targets eligible for retry", async () => {
    const saveBasic = vi.fn().mockResolvedValue(undefined);
    const saveSkill = vi.fn().mockRejectedValue(new Error("skill failed"));

    const result = await runSaveTargets([
      target("basic", saveBasic),
      target("skill-1", saveSkill),
    ]);

    expect(result.succeeded).toEqual(["basic"]);
    expect(result.failed).toEqual(["skill-1"]);
  });

  it("runs independent targets concurrently", async () => {
    let resolveFirst: (() => void) | undefined;
    const first = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const second = vi.fn().mockResolvedValue(undefined);

    const saving = runSaveTargets([
      target("skill-1", first),
      target("skill-2", second),
    ]);

    expect(second).toHaveBeenCalledOnce();
    resolveFirst?.();
    await saving;
  });
});
