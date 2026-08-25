import { useMatches } from "@tanstack/react-router";

import { type LoginMode } from "../../../components/shell/login-mode-context";
import "../../../types/router";

export function useRouteMode(): LoginMode {
  const matches = useMatches();
  return matches.reduce<LoginMode>(
    (mode, match) => match.staticData.workspaceMode ?? mode,
    "operator",
  );
}
