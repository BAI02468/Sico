import { atom } from "jotai";

import {
  getItemFromLocalStorage,
  LOCALE_LS,
  setItemToLocalStorage,
} from "../utils/local-storage";

export type Locale = "en" | "zh-CN";
export type LocalePreference = Locale | "auto";

const UNSET = Symbol("localeAtom.unset");
type Unset = typeof UNSET;

// Final fallback when neither a stored preference nor a recognised browser
// language is available.
const DEFAULT_LOCALE: Locale = "en";

// Maps a BCP 47 language tag (e.g. "zh", "zh-Hans-CN", "en-US") to a supported
// locale, or null if unsupported.
function matchLocale(tag: string): Locale | null {
  const lower = tag.toLowerCase();
  if (lower.startsWith("zh")) {
    return "zh-CN";
  }
  if (lower.startsWith("en")) {
    return "en";
  }
  return null;
}

// Infers a supported locale from the browser's preferred languages, honouring
// their priority order. Returns null when nothing matches or when `navigator`
// is unavailable (SSR / tests).
function detectBrowserLocale(): Locale | null {
  if (typeof navigator === "undefined") {
    return null;
  }
  const tags = navigator.languages.length
    ? navigator.languages
    : [navigator.language];
  for (const tag of tags) {
    const matched = tag ? matchLocale(tag) : null;
    if (matched) {
      return matched;
    }
  }
  return null;
}

// Priority: stored preference > detected browser language > default.
function loadLocalePreferenceFromLS(): LocalePreference {
  const value = getItemFromLocalStorage(LOCALE_LS);
  if (value === "en" || value === "zh-CN" || value === "auto") {
    return value;
  }
  return "auto";
}

function persistLocalePreference(locale: LocalePreference): void {
  setItemToLocalStorage(LOCALE_LS, locale);
}

function resolveLocale(preference: LocalePreference): Locale {
  return preference === "auto"
    ? (detectBrowserLocale() ?? DEFAULT_LOCALE)
    : preference;
}

const internalLocalePreferenceAtom = atom<LocalePreference | Unset>(UNSET);

export const localePreferenceAtom = atom<
  LocalePreference,
  [LocalePreference],
  void
>(
  (get) => {
    const value = get(internalLocalePreferenceAtom);
    return value === UNSET ? loadLocalePreferenceFromLS() : value;
  },
  (_get, set, next: LocalePreference) => {
    persistLocalePreference(next);
    set(internalLocalePreferenceAtom, next);
  },
);

export const localeAtom = atom((get) =>
  resolveLocale(get(localePreferenceAtom)),
);
