import {
  createContext,
  type JSX,
  type ReactNode,
  useContext,
  useMemo,
} from "react";

/**
 * App-level feature configuration for sico shared features. Each flag's
 * DEFAULT is sico's own behaviour; a downstream app (e.g. dwp) overrides
 * only what it needs via `<SicoConfigProvider config={...}>`.
 *
 * Unlike `ApiClientProvider`, NOT wrapping is valid: `useSicoConfig`
 * returns `DEFAULT_SICO_CONFIG` so sico keeps working unconfigured.
 *
 * Flags are flat — prefix the name with the feature it belongs to (e.g.
 * `loginPrefillCredentials`) rather than nesting, so a one-flag feature
 * doesn't pay for a namespace object.
 */
export type SicoConfig = {
  // Seed the login form with the local-dev operator account. sico keeps it
  // on for convenience; dwp turns it off (enterprise SSO accounts).
  readonly loginPrefillCredentials: boolean;
};

export const DEFAULT_SICO_CONFIG: SicoConfig = {
  loginPrefillCredentials: true,
};

const SicoConfigContext = createContext<SicoConfig>(DEFAULT_SICO_CONFIG);

export function SicoConfigProvider({
  config,
  children,
}: {
  readonly config?: Partial<SicoConfig>;
  readonly children: ReactNode;
}): JSX.Element {
  const value = useMemo(
    () => ({ ...DEFAULT_SICO_CONFIG, ...config }),
    [config],
  );
  return (
    <SicoConfigContext.Provider value={value}>
      {children}
    </SicoConfigContext.Provider>
  );
}

export function useSicoConfig(): SicoConfig {
  return useContext(SicoConfigContext);
}
