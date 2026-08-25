import { type LoginMode } from "../components/shell/login-mode-context";

declare module "@tanstack/react-router" {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- TanStack Router uses interface augmentation
  interface StaticDataRouteOption {
    hidePrimarySidebar?: boolean;
    workspaceMode?: LoginMode;
  }
}
