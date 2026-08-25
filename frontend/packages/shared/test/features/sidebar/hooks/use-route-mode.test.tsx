import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useRouteMode } from "@/features/sidebar/hooks/use-route-mode";

const { mockUseLocation, mockUseMatches } = vi.hoisted(() => ({
  mockUseLocation: vi.fn(),
  mockUseMatches: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => mockUseLocation(),
  useMatches: () => mockUseMatches(),
}));

beforeEach(() => {
  mockUseLocation.mockReturnValue({ pathname: "/digital-worker" });
  mockUseMatches.mockReturnValue([]);
});

describe("useRouteMode", () => {
  it("defaults to operator when no active route declares a mode", () => {
    expect(renderHook(() => useRouteMode()).result.current).toBe("operator");
  });

  it("uses the Studio parent workspace mode for descendant routes", () => {
    mockUseMatches.mockReturnValue([
      { staticData: {} },
      { staticData: { workspaceMode: "developer" } },
      { staticData: {} },
    ]);

    expect(renderHook(() => useRouteMode()).result.current).toBe("developer");
  });

  it("lets the deepest declared workspace mode win", () => {
    mockUseLocation.mockReturnValue({ pathname: "/studio" });
    mockUseMatches.mockReturnValue([
      { staticData: { workspaceMode: "developer" } },
      { staticData: { workspaceMode: "operator" } },
    ]);

    expect(renderHook(() => useRouteMode()).result.current).toBe("operator");
  });

  it("does not classify an unmarked studio-prefixed route as developer", () => {
    mockUseLocation.mockReturnValue({ pathname: "/studio-tools" });

    expect(renderHook(() => useRouteMode()).result.current).toBe("operator");
  });
});
