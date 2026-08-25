// Re-export of `@sico/shared/testing/render-with-i18n` (the canonical location).
// The vitest alias that redirects `@testing-library/react` to a wrapped render
// targets THIS per-package path, so the thin file must exist here — but the
// implementation lives once under `@sico/shared/src/testing/render-with-i18n`.
// This is a test helper (never HMR-processed), so react-refresh's
// component-only-export rule doesn't apply.
// eslint-disable-next-line react-refresh/only-export-components
export * from "@sico/shared/testing/render-with-i18n.tsx";
