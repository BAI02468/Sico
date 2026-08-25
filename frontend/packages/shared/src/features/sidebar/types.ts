import { type ReactNode } from "react";

// Data shape for a sidebar nav row — the `to`/`label`/`icon` triple that
// `<NavItem>`/`<RailNavItem>` render into sico's pill (expanded) and rail
// (collapsed) chrome. Callers supply only the route + label + icon; the
// components own the look and derive the active highlight via `useActiveNav`.
export type NavItemData = {
  // Destination path. sico does not validate it — the router resolves it. The
  // runtime guard against dangerous URIs (`javascript:`, `data:`) is TanStack
  // Link's protocol allowlist (http/https/mailto/tel), which must not be
  // widened or overridden. Keep `to` a developer-controlled route literal,
  // never a value sourced from network/user input.
  readonly to: string;
  readonly label: string;
  readonly icon: ReactNode;
};
