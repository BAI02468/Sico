import { useAtomValue } from "jotai";

import { type Locale, localeAtom } from "../../atoms/locale-atom";

// Intentionally empty until an RTL locale (e.g. `ar`, `he`) is added to the
// supported set — the two current locales (`en`, `zh-CN`) are both LTR, so
// `useIsRTL()` returns `false` today. This is a forward-looking seam, not an
// oversight: adding an RTL locale here is all it takes to enable `dir="rtl"`.
const RTL_LOCALES = new Set<Locale>([]);

/**
 * Returns true if the current active locale uses a Right-to-Left (RTL) script.
 * Components must read this hook instead of `document.documentElement.dir`
 * because the latter doesn't trigger a React re-render when it changes.
 */
export function useIsRTL(): boolean {
  const locale = useAtomValue(localeAtom);
  return RTL_LOCALES.has(locale);
}
