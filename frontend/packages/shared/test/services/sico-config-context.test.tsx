import { renderHook } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_SICO_CONFIG,
  SicoConfigProvider,
  useSicoConfig,
} from "@/services/sico-config-context";

describe("useSicoConfig", () => {
  // The defining difference from ApiClientProvider: sico itself never wraps
  // the provider, so the bare hook must return defaults, not throw.
  it("returns DEFAULT_SICO_CONFIG when no provider wraps it", () => {
    const { result } = renderHook(() => useSicoConfig());
    expect(result.current).toEqual(DEFAULT_SICO_CONFIG);
  });

  it("returns DEFAULT_SICO_CONFIG when provider has no override", () => {
    const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
      <SicoConfigProvider>{children}</SicoConfigProvider>
    );
    const { result } = renderHook(() => useSicoConfig(), { wrapper });
    expect(result.current).toEqual(DEFAULT_SICO_CONFIG);
  });

  it("applies a partial override over the defaults", () => {
    // dwp's real config: flip the login flag away from the sico default.
    const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
      <SicoConfigProvider config={{ loginPrefillCredentials: false }}>
        {children}
      </SicoConfigProvider>
    );
    const { result } = renderHook(() => useSicoConfig(), { wrapper });
    expect(result.current).toEqual({ loginPrefillCredentials: false });
  });
});
