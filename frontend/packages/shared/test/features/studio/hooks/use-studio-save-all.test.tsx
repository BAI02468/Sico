import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useStudioSaveAll } from "@/features/studio/hooks/use-studio-save-all";

const values = { name: "Atlas", role: "researcher" };

function target(
  id: string,
  save: () => Promise<void>,
): { id: string; dirty: boolean; save: () => Promise<void> } {
  return { id, dirty: true, save };
}

describe("useStudioSaveAll", () => {
  it("does not write when Basic and Skill targets are clean", async () => {
    const saveBasic = vi.fn();
    const { result } = renderHook(() => useStudioSaveAll({ saveBasic }));

    await act(async () => {
      await result.current.saveAll({
        values,
        basicDirty: false,
        targets: [],
        openPublishAfterSave: false,
      });
    });

    expect(saveBasic).not.toHaveBeenCalled();
  });

  it("shares one create request for rapid Save and Publish actions", async () => {
    let resolveCreate: ((agentId: string) => void) | undefined;
    const saveBasic = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const onCreated = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useStudioSaveAll({ saveBasic, onCreated }),
    );

    let save: Promise<unknown> | undefined;
    let publish: Promise<unknown> | undefined;
    act(() => {
      save = result.current.saveAll({
        values,
        basicDirty: true,
        targets: [],
        openPublishAfterSave: false,
      });
      publish = result.current.saveAll({
        values,
        basicDirty: true,
        targets: [],
        openPublishAfterSave: true,
      });
    });

    expect(publish).toBe(save);
    resolveCreate?.("agent-1");
    await act(async () => {
      await save;
    });

    expect(saveBasic).toHaveBeenCalledOnce();
    expect(onCreated).toHaveBeenCalledWith("agent-1", [], true);
  });

  it("hands only failed staged drafts and Publish intent to Edit", async () => {
    const saveBasic = vi.fn().mockResolvedValue("agent-1");
    const saveSucceededSkill = vi.fn().mockResolvedValue(undefined);
    const saveFailedSkill = vi
      .fn()
      .mockRejectedValue(new Error("skill failed"));
    const failedDraft: {
      id: string;
      file: File;
      status: "failed";
    } = {
      id: "skill-failed",
      file: new File(["skill"], "failed.md"),
      status: "failed",
    };
    const onCreated = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useStudioSaveAll({ saveBasic, onCreated }),
    );

    await act(async () => {
      await result.current.saveAll({
        values,
        basicDirty: true,
        targets: [
          target("skill-succeeded", saveSucceededSkill),
          {
            ...target("skill-failed", saveFailedSkill),
            handoffDraft: () => failedDraft,
          },
        ],
        openPublishAfterSave: true,
      });
    });

    expect(saveSucceededSkill).toHaveBeenCalledWith("agent-1");
    expect(saveFailedSkill).toHaveBeenCalledWith("agent-1");
    expect(onCreated).toHaveBeenCalledWith("agent-1", [failedDraft], false);
  });

  it("does not create another agent when a failed Create target is retried", async () => {
    const saveBasic = vi.fn().mockResolvedValue("agent-1");
    const saveSkill = vi
      .fn()
      .mockRejectedValueOnce(new Error("skill failed"))
      .mockResolvedValueOnce(undefined);
    const onCreated = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useStudioSaveAll({ saveBasic, onCreated }),
    );

    await act(async () => {
      await result.current.saveAll({
        values,
        basicDirty: true,
        targets: [target("skill-1", saveSkill)],
        openPublishAfterSave: false,
      });
    });
    await act(async () => {
      await result.current.saveAll({
        values,
        basicDirty: false,
        targets: [target("skill-1", saveSkill)],
        openPublishAfterSave: false,
      });
    });

    expect(saveBasic).toHaveBeenCalledOnce();
    expect(saveSkill).toHaveBeenNthCalledWith(1, "agent-1");
    expect(saveSkill).toHaveBeenNthCalledWith(2, "agent-1");
    expect(onCreated).toHaveBeenCalledOnce();
  });

  it("retries only failed Edit targets after Basic and another Skill succeed", async () => {
    const saveBasic = vi.fn().mockResolvedValue(undefined);
    const saveSucceededSkill = vi.fn().mockResolvedValue(undefined);
    const saveFailedSkill = vi
      .fn()
      .mockRejectedValueOnce(new Error("skill failed"))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() =>
      useStudioSaveAll({ agentId: "agent-1", saveBasic }),
    );

    await act(async () => {
      await result.current.saveAll({
        values,
        basicDirty: true,
        targets: [
          target("skill-succeeded", saveSucceededSkill),
          target("skill-failed", saveFailedSkill),
        ],
        openPublishAfterSave: false,
      });
    });
    await act(async () => {
      await result.current.saveAll({
        values,
        basicDirty: false,
        targets: [target("skill-failed", saveFailedSkill)],
        openPublishAfterSave: false,
      });
    });

    expect(saveBasic).toHaveBeenCalledOnce();
    expect(saveSucceededSkill).toHaveBeenCalledOnce();
    expect(saveFailedSkill).toHaveBeenNthCalledWith(1, "agent-1");
    expect(saveFailedSkill).toHaveBeenNthCalledWith(2, "agent-1");
  });
});
