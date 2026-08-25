import { act, renderHook } from "@testing-library/react";
import { AxiosError } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  type SkillAutosaveSnapshot,
  useSkillAutosave,
} from "@/features/skill/hooks/use-skill-autosave";

function snapshot(content: string): SkillAutosaveSnapshot {
  const files = [{ path: "SKILL.md", content }];
  return { files, actions: [], changedFiles: files, actionsChanged: false };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useSkillAutosave", () => {
  it("chains a trailing edit from the returned version", async () => {
    let resolveFirst: ((value: string) => void) | undefined;
    const first = new Promise<string>((resolve) => {
      resolveFirst = resolve;
    });
    const onSave = vi
      .fn()
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce("v3");
    const onAcknowledge = vi.fn();
    const { rerender } = renderHook(
      ({ draft }) =>
        useSkillAutosave({
          enabled: true,
          selectedVersion: "v1",
          snapshot: draft,
          baseline: { files: snapshot("baseline").files, actions: [] },
          hasChanges: true,
          onSave,
          onAcknowledge,
        }),
      { initialProps: { draft: snapshot("first") } },
    );

    void act(() => vi.advanceTimersByTime(600));
    expect(onSave).toHaveBeenCalledWith(
      { files: snapshot("first").files, actions: undefined },
      "v1",
    );
    rerender({ draft: snapshot("latest") });

    await act(async () => {
      resolveFirst?.("v2");
      await Promise.resolve();
    });
    expect(onSave).toHaveBeenLastCalledWith(
      { files: snapshot("latest").files, actions: undefined },
      "v2",
    );
    expect(onAcknowledge).toHaveBeenCalledTimes(2);
  });

  it("persists a revert made while the edited snapshot is in flight", async () => {
    let resolveFirst: ((value: string) => void) | undefined;
    const first = new Promise<string>((resolve) => {
      resolveFirst = resolve;
    });
    const onSave = vi
      .fn()
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce("v3");
    const baseline = { files: snapshot("baseline").files, actions: [] };
    const { rerender } = renderHook(
      ({ draft, changed }) =>
        useSkillAutosave({
          enabled: true,
          selectedVersion: "v1",
          snapshot: draft,
          baseline,
          hasChanges: changed,
          onSave,
          onAcknowledge: vi.fn(),
        }),
      { initialProps: { draft: snapshot("edited"), changed: true } },
    );

    void act(() => vi.advanceTimersByTime(600));
    rerender({ draft: snapshot("baseline"), changed: false });
    await act(async () => resolveFirst?.("v2"));

    expect(onSave).toHaveBeenLastCalledWith(
      { files: snapshot("baseline").files, actions: undefined },
      "v2",
    );
  });

  it("drops a structurally equal revert to the in-flight snapshot", async () => {
    let resolveFirst: ((value: string) => void) | undefined;
    const first = new Promise<string>((resolve) => {
      resolveFirst = resolve;
    });
    const onSave = vi.fn().mockReturnValueOnce(first);
    const baseline = { files: snapshot("baseline").files, actions: [] };
    const { rerender } = renderHook(
      ({ draft }) =>
        useSkillAutosave({
          enabled: true,
          selectedVersion: "v1",
          snapshot: draft,
          baseline,
          hasChanges: true,
          onSave,
          onAcknowledge: vi.fn(),
        }),
      { initialProps: { draft: snapshot("B") } },
    );

    void act(() => vi.advanceTimersByTime(600));
    rerender({ draft: snapshot("C") });
    rerender({ draft: snapshot("B") });
    await act(async () => resolveFirst?.("v2"));

    expect(onSave).toHaveBeenCalledOnce();
  });

  it("cancels a scheduled snapshot when editing becomes disabled", async () => {
    const onSave = vi.fn().mockResolvedValue("v2");
    const baseline = { files: snapshot("baseline").files, actions: [] };
    const { rerender } = renderHook(
      ({ enabled }) =>
        useSkillAutosave({
          enabled,
          selectedVersion: "v1",
          snapshot: snapshot("edited"),
          baseline,
          hasChanges: true,
          onSave,
          onAcknowledge: vi.fn(),
        }),
      { initialProps: { enabled: true } },
    );

    rerender({ enabled: false });
    await act(() => vi.advanceTimersByTimeAsync(600));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("enters conflict without retrying during ordinary flush", async () => {
    const conflict = new AxiosError("conflict");
    Object.defineProperty(conflict, "response", { value: { status: 409 } });
    const onSave = vi.fn().mockRejectedValue(conflict);
    const baseline = { files: snapshot("baseline").files, actions: [] };
    const { result } = renderHook(() =>
      useSkillAutosave({
        enabled: true,
        selectedVersion: "v1",
        snapshot: snapshot("edited"),
        baseline,
        hasChanges: true,
        onSave,
        onAcknowledge: vi.fn(),
      }),
    );

    await act(() => vi.advanceTimersByTimeAsync(600));
    expect(result.current.status).toBe("conflict");
    expect(await result.current.flush()).toBe(false);
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("keeps the returned version after the queue settles", async () => {
    const onSave = vi
      .fn()
      .mockResolvedValueOnce("v2")
      .mockResolvedValueOnce("v3");
    const { rerender } = renderHook(
      ({ draft }) =>
        useSkillAutosave({
          enabled: true,
          selectedVersion: "v1",
          snapshot: draft,
          baseline: { files: snapshot("baseline").files, actions: [] },
          hasChanges: true,
          onSave,
          onAcknowledge: vi.fn(),
        }),
      { initialProps: { draft: snapshot("first") } },
    );

    await act(() => vi.advanceTimersByTimeAsync(600));
    rerender({ draft: snapshot("later") });
    await act(() => vi.advanceTimersByTimeAsync(600));

    expect(onSave).toHaveBeenLastCalledWith(
      { files: snapshot("later").files, actions: undefined },
      "v2",
    );
  });
});
