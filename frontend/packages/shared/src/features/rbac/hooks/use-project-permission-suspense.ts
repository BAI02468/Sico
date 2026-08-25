import { useAtomValue } from "jotai";

import { usePermissionSnapshotSuspenseQuery } from "./use-permission-snapshot";
import { userAtom } from "../../../atoms/auth-atom";
import { type ProjectCapabilities } from "../capabilities";
import { deriveProjectCapabilities } from "../permission-snapshot";

export type ProjectPermissionSuspense = ProjectCapabilities & {
  /** The current user's email — used for per-row `.own` checks. */
  userEmail: string | null;
};

export function useProjectPermissionSuspense(
  projectId: number,
): ProjectPermissionSuspense {
  const user = useAtomValue(userAtom);
  const { data } = usePermissionSnapshotSuspenseQuery();
  return {
    ...deriveProjectCapabilities(data, projectId),
    userEmail: user?.email ?? null,
  };
}
