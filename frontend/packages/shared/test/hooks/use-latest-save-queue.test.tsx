import { act, renderHook } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useLatestSaveQueue } from "@/hooks/use-latest-save-queue";

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolvePromise: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve: (value: T) => resolvePromise?.(value),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useLatestSaveQueue", () => {
  it("saves an explicit undefined snapshot", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useLatestSaveQueue<string | undefined>({ save }),
    );

    act(() => result.current.schedule(undefined));
    await act(() => vi.advanceTimersByTimeAsync(600));
    expect(save).toHaveBeenCalledWith(undefined);
  });

  it("debounces burst edits and saves only the latest snapshot", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useLatestSaveQueue({ save, delayMs: 600 }),
    );

    act(() => {
      result.current.schedule("first");
      result.current.schedule("latest");
    });
    await vi.advanceTimersByTimeAsync(599);
    expect(save).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith("latest");
    expect(result.current.status).toBe("saved");
  });

  it("coalesces edits during an in-flight save into one trailing write", async () => {
    const first = deferred<void>();
    const save = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() =>
      useLatestSaveQueue({ save, delayMs: 600 }),
    );

    act(() => {
      result.current.schedule("first");
      vi.advanceTimersByTime(600);
    });
    act(() => {
      result.current.schedule("middle");
      result.current.schedule("latest");
    });
    expect(save).toHaveBeenCalledTimes(1);

    await act(async () => {
      first.resolve();
      await Promise.resolve();
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith("latest");
    expect(result.current.status).toBe("saved");
  });

  it("awaits asynchronous success acknowledgement before settling", async () => {
    const acknowledgement = deferred<void>();
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useLatestSaveQueue({
        save,
        onSuccess: () => acknowledgement.promise,
      }),
    );

    act(() => result.current.schedule("draft"));
    let flush: Promise<boolean> | undefined;
    act(() => {
      flush = result.current.flush();
    });
    expect(result.current.status).toBe("saving");
    await act(async () => acknowledgement.resolve());
    if (!flush) {
      throw new Error("Expected flush promise");
    }
    expect(await flush).toBe(true);
    expect(result.current.status).toBe("saved");
  });

  it("flushes a scheduled snapshot without waiting for debounce", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useLatestSaveQueue({ save }));

    act(() => result.current.schedule("draft"));
    let flushed = false;
    await act(async () => {
      flushed = await result.current.flush();
    });

    expect(flushed).toBe(true);
    expect(save).toHaveBeenCalledWith("draft");
  });

  it("drops a stale trailing snapshot when the latest matches in-flight", async () => {
    const first = deferred<void>();
    const save = vi.fn().mockReturnValueOnce(first.promise);
    const { result } = renderHook(() => useLatestSaveQueue({ save }));

    act(() => {
      result.current.schedule("B");
      vi.advanceTimersByTime(600);
    });
    act(() => {
      result.current.schedule("C");
      result.current.schedule("B");
    });
    await act(async () => first.resolve());

    expect(save).toHaveBeenCalledOnce();
    expect(result.current.status).toBe("saved");
  });

  it("rearms retained pending work after StrictMode effect replay", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    renderHook(
      () => {
        const queue = useLatestSaveQueue({ save });
        const { schedule } = queue;
        useEffect(() => schedule("draft"), [schedule]);
        return queue;
      },
      { reactStrictMode: true },
    );

    await act(() => vi.advanceTimersByTimeAsync(600));
    expect(save).toHaveBeenCalledOnce();
  });

  it("does not retry a conflict during ordinary flush", async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error("conflict"))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() =>
      useLatestSaveQueue({ save, isConflict: () => true }),
    );

    act(() => result.current.schedule("draft"));
    await act(() => vi.advanceTimersByTimeAsync(600));
    expect(result.current.status).toBe("conflict");

    expect(await result.current.flush()).toBe(false);
    expect(save).toHaveBeenCalledOnce();
    expect(await result.current.retry()).toBe(true);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("pauses after failure and retries the latest snapshot", async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() =>
      useLatestSaveQueue({ save, delayMs: 600 }),
    );

    act(() => result.current.schedule("failed"));
    await act(() => vi.advanceTimersByTimeAsync(600));
    expect(result.current.status).toBe("error");
    act(() => result.current.schedule("latest"));

    let retried = false;
    await act(async () => {
      retried = await result.current.retry();
    });
    expect(retried).toBe(true);
    expect(save).toHaveBeenLastCalledWith("latest");
    expect(result.current.status).toBe("saved");
  });
});
