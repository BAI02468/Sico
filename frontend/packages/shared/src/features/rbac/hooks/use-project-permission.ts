import { useAtomValue } from "jotai";

import { usePermissionSnapshotQuery } from "./use-permission-snapshot";
import { userAtom } from "../../../atoms/auth-atom";
import { type ProjectCapabilities } from "../capabilities";
import {
  deriveProjectCapabilities,
  EMPTY_PERMISSION_SNAPSHOT,
} from "../permission-snapshot";

export type ProjectPermission = ProjectCapabilities & {
  /** The current user's email — the identity used for per-row `.own` checks
   * (the User schema has no username). Null until the user atom hydrates. */
  userEmail: string | null;
  isLoading: boolean;
  /** True when the roles fetch failed. Capabilities remain fail-closed. */
  isError: boolean;
};

export function useProjectPermission(projectId: number): ProjectPermission {
  const user = useAtomValue(userAtom);
  const { data, isLoading, isError } = usePermissionSnapshotQuery();
  const capabilities = deriveProjectCapabilities(
    isError ? EMPTY_PERMISSION_SNAPSHOT : (data ?? EMPTY_PERMISSION_SNAPSHOT),
    projectId,
  );
  return {
    ...capabilities,
    userEmail: user?.email ?? null,
    isLoading,
    isError,
  };
}
