import { renderHook } from "@testing-library/react";
import { createStore, Provider as JotaiProvider } from "jotai";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { userAtom } from "@/atoms/auth-atom";
import { useAgentsQuery } from "@/features/digital-worker/hooks/use-agents-query";
import { useDwPreview } from "@/features/sidebar/hooks/use-dw-preview";

vi.mock("@/features/digital-worker/hooks/use-agents-query", () => ({
  useAgentsQuery: vi.fn(),
}));

const mockQuery = (overrides: Record<string, unknown>): void => {
  vi.mocked(useAgentsQuery).mockReturnValue(overrides as never);
};

describe("useDwPreview", () => {
  beforeEach(() => {
    vi.mocked(useAgentsQuery).mockReset();
  });

  function makeWrapper(store: ReturnType<typeof createStore>) {
    return function Wrapper({ children }: { children: ReactNode }) {
      return createElement(JotaiProvider, { store }, children);
    };
  }

  it("disables the preview query when no authenticated username exists", () => {
    mockQuery({ isPending: true, isError: false, data: undefined });
    const store = createStore();
    store.set(userAtom, null);

    renderHook(() => useDwPreview(), { wrapper: makeWrapper(store) });

    expect(useAgentsQuery).toHaveBeenLastCalledWith(
      { operatorUsername: undefined },
      { enabled: false },
    );
  });

  it("enables the preview query for the authenticated username", () => {
    mockQuery({ isPending: true, isError: false, data: undefined });
    const store = createStore();
    store.set(userAtom, { id: 1, email: "me@sico.ai", roles: [] });

    renderHook(() => useDwPreview(), { wrapper: makeWrapper(store) });

    expect(useAgentsQuery).toHaveBeenLastCalledWith(
      { operatorUsername: "me@sico.ai" },
      { enabled: true },
    );
  });

  it("returns pending when query is pending", () => {
    mockQuery({ isPending: true, isError: false, data: undefined });
    const { result } = renderHook(() => useDwPreview());
    expect(result.current).toEqual({ status: "pending" });
  });

  it("returns error when query is in error state", () => {
    mockQuery({ isPending: false, isError: true, data: undefined });
    const { result } = renderHook(() => useDwPreview());
    expect(result.current).toEqual({ status: "error" });
  });

  it("caps items at DW_PREVIEW (5)", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      name: `a${i}`,
      role: "r",
      iconUri: "",
    }));
    mockQuery({
      isPending: false,
      isError: false,
      data: { pages: [{ items }] },
    });
    const { result } = renderHook(() => useDwPreview());
    expect(result.current.status).toBe("ready");
    if (result.current.status === "ready") {
      expect(result.current.items).toHaveLength(5);
    }
  });

  it("returns ready with empty items when no agents", () => {
    mockQuery({
      isPending: false,
      isError: false,
      data: { pages: [{ items: [] }] },
    });
    const { result } = renderHook(() => useDwPreview());
    expect(result.current).toEqual({ status: "ready", items: [] });
  });
});
