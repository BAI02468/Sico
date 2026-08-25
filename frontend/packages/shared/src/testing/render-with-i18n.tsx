import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
// This module lives under `src/` (so `@sico/app` can import it) but is a
// test-only helper; `@testing-library/react` is legitimately a devDependency.
// eslint-disable-next-line import-x/no-extraneous-dependencies
import {
  type RenderHookOptions,
  type RenderOptions,
  render as rtlRender,
  renderHook as rtlRenderHook,
} from "@testing-library/react";
import type { ComponentType, JSX, ReactElement, ReactNode } from "react";

// Canonical i18n render helper, shared by @sico/shared and @sico/app tests.
// Each package's `test/_helpers/render-with-i18n.tsx` re-exports this (the
// vitest alias that redirects `@testing-library/react` targets that per-package
// path, so the thin wrapper must stay — but the implementation lives here once).
//
// Compiled `t`/`<Trans>` macros resolve against the global i18n singleton /
// LinguiContext. Activate an empty "en" catalog so macros fall back to their
// source `message` (tests keep asserting the English strings). Guarded so this
// works even if the helper loads before test/setup.ts.
if (!i18n.locale) {
  i18n.loadAndActivate({ locale: "en", messages: {} });
}

// Compose the mandatory <I18nProvider> around any wrapper a test already passes
// (e.g. its own QueryClient/Jotai providers), so `<Trans>`/`useLingui` render
// without every test needing to add the provider itself.
function withI18nProvider(
  Wrapper?: ComponentType<{ children: ReactNode }>,
): ComponentType<{ children: ReactNode }> {
  return function I18nTestWrapper({
    children,
  }: {
    children: ReactNode;
  }): JSX.Element {
    return (
      <I18nProvider i18n={i18n}>
        {Wrapper ? <Wrapper>{children}</Wrapper> : children}
      </I18nProvider>
    );
  };
}

function render(
  ui: ReactElement,
  options?: RenderOptions,
): ReturnType<typeof rtlRender> {
  return rtlRender(ui, {
    ...options,
    wrapper: withI18nProvider(options?.wrapper),
  });
}

function renderHook<Result, Props>(
  callback: (props: Props) => Result,
  options?: RenderHookOptions<Props>,
): ReturnType<typeof rtlRenderHook<Result, Props>> {
  return rtlRenderHook(callback, {
    ...options,
    wrapper: withI18nProvider(options?.wrapper),
  });
}

// Re-export the rest of RTL untouched. Local `render`/`renderHook` take
// precedence over the star re-export, so callers transparently get the wrapped
// versions.
// eslint-disable-next-line import-x/no-extraneous-dependencies
export * from "@testing-library/react";
export { render, renderHook };
