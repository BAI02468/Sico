import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  SkillSaveRegistryProvider,
  useSkillSaveRegistry,
} from "@/features/skill/components/setup/skill-save-registry";

function Wrapper({ children }: { children: ReactNode }): React.JSX.Element {
  return <SkillSaveRegistryProvider>{children}</SkillSaveRegistryProvider>;
}

function deferred(): {
  promise: Promise<boolean>;
  resolve: (value: boolean) => void;
} {
  let resolvePromise: ((value: boolean) => void) | undefined;
  const promise = new Promise<boolean>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: (value) => resolvePromise?.(value) };
}

describe("SkillSaveRegistry", () => {
  it("drains a target registered while flush is in progress", async () => {
    const first = deferred();
    const secondFlush = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useSkillSaveRegistry(), {
      wrapper: Wrapper,
    });
    act(() => {
      result.current.register({
        id: "first",
        dirty: true,
        status: "saving",
        save: vi.fn(),
        flush: () => first.promise,
      });
    });

    let flushPromise: Promise<boolean> | undefined;
    act(() => {
      flushPromise = result.current.flushAll();
    });
    act(() => {
      result.current.register({
        id: "second",
        dirty: true,
        status: "scheduled",
        save: vi.fn(),
        flush: secondFlush,
      });
    });
    await act(async () => first.resolve(true));

    expect(await flushPromise).toBe(true);
    expect(secondFlush).toHaveBeenCalledOnce();
  });

  it("maps rejected targets to a false result", async () => {
    const { result } = renderHook(() => useSkillSaveRegistry(), {
      wrapper: Wrapper,
    });
    act(() => {
      result.current.register({
        id: "failed",
        dirty: true,
        status: "error",
        save: vi.fn(),
        flush: vi.fn().mockRejectedValue(new Error("offline")),
      });
    });

    expect(await result.current.flushAll()).toBe(false);
  });

  it("reports an error with a retry callback as retryable", () => {
    const { result } = renderHook(() => useSkillSaveRegistry(), {
      wrapper: Wrapper,
    });
    act(() => {
      result.current.register({
        id: "retryable",
        dirty: true,
        status: "error",
        save: vi.fn(),
        retry: vi.fn().mockResolvedValue(true),
      });
    });

    expect(result.current.hasRetryableFailure).toBe(true);
  });

  it("does not report a discard-only error as retryable", () => {
    const { result } = renderHook(() => useSkillSaveRegistry(), {
      wrapper: Wrapper,
    });
    act(() => {
      result.current.register({
        id: "discard-only",
        dirty: true,
        status: "error",
        save: vi.fn(),
        discard: vi.fn(),
      });
    });

    expect(result.current.hasRetryableFailure).toBe(false);
    expect(result.current.hasDiscardableFailure).toBe(true);
  });
});
