import { i18n, type Messages } from "@lingui/core";
import { I18nProvider as LinguiProvider } from "@lingui/react";
import { useAtomValue } from "jotai";
import { type JSX, type ReactNode, useEffect, useState } from "react";

import { useIsRTL } from "./use-is-rtl";
import { type Locale, localeAtom } from "../../atoms/locale-atom";
import { logger } from "../../utils/logger";

export type I18nProviderProps = {
  readonly children: ReactNode;
};

// Lazy-load the compiled catalog for a locale. A template-literal `import()`
// lets Vite glob `locales/*/messages` at build time while resolving to `any`
// under tsgo (the generated `messages.js` ships no `.d.ts`); the cast pins the
// known shape so the rest of the flow stays typed.
async function loadCatalogMessages(locale: Locale): Promise<Messages> {
  // oxlint-disable-next-line typescript-eslint/no-unsafe-assignment -- the generated `messages.mjs` ships no `.d.ts`, so the template-literal `import()` resolves to `any`; the compiled catalog always exposes `messages: Messages`
  const catalog: { messages: Messages } = await import(
    `../../locales/${locale}/messages.mjs`
  );
  return catalog.messages;
}

/**
 * i18n core provider. Mounts at the root of the app, inside JotaiProvider.
 * Listens to `localeAtom`, lazy loads the compiled catalog via `import()`,
 * and syncs `document.documentElement.lang` and `.dir` for typography rules.
 */
export function I18nProvider({
  children,
}: I18nProviderProps): JSX.Element | null {
  const currentLocale = useAtomValue(localeAtom);
  const isRTL = useIsRTL();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadCatalog(locale: Locale): Promise<void> {
      try {
        const messages = await loadCatalogMessages(locale);

        if (mounted) {
          i18n.load(locale, messages);
          i18n.activate(locale);
          // Sync DOM lang for CSS `:lang()` selectors (PR #327). Set in both the
          // success and the degrade path below so the `lang` attribute never
          // desyncs from the active locale on a chunk-load failure.
          document.documentElement.lang = locale;
          setIsLoaded(true);
        }
      } catch (error) {
        logger.error(
          `I18nProvider: Failed to load catalog for locale '${locale}'`,
          { error },
        );
        // Degrade instead of white-screening: activate an empty catalog so
        // `<Trans>`/`t()` fall back to their source (English) messages, and
        // unblock rendering. Without this, a failed chunk load leaves
        // `isLoaded` false forever and the provider returns null permanently.
        if (mounted) {
          i18n.load(locale, {});
          i18n.activate(locale);
          document.documentElement.lang = locale;
          setIsLoaded(true);
        }
      }
    }

    // When the locale atom changes, we start loading the new catalog.
    // If it's the first render, this fetches 'en' (or 'zh-CN') and sets isLoaded to true.
    void loadCatalog(currentLocale);

    return () => {
      mounted = false;
    };
  }, [currentLocale]);

  // Document direction is a pure function of the locale's script, decoupled from
  // catalog loading: keyed on `isRTL` alone so it (a) stays in sync even when a
  // catalog chunk fails to load, and (b) doesn't make the catalog effect above
  // re-`activate()` twice when an RTL locale is eventually added.
  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
  }, [isRTL]);

  // Block rendering until the first catalog is loaded to avoid Flash of Un-translated Content (FOUC).
  // In a more complex app, this could return a specific Loading UI instead of null.
  if (!isLoaded) {
    return null;
  }

  return <LinguiProvider i18n={i18n}>{children}</LinguiProvider>;
}
