import { useAtomValue } from "jotai";
import { z } from "zod";

import { usePermissionSnapshotSuspenseQuery } from "./use-permission-snapshot";
import { userAtom } from "../../../atoms/auth-atom";
import { sameIdentity } from "../../projects/utils/same-identity";
import { type PermissionSnapshot } from "../permission-snapshot";

const agentIdSchema = z.string().uuid();

export type AgentPermissionIdentity = {
  email: string | null | undefined;
  username?: string | null | undefined;
};

export type AgentPermissionTarget = {
  agentId: string | null;
  creatorUsername: string | null;
};

export type AgentPermissionCapabilities = {
  isOwner: boolean;
  isEditor: boolean;
  canEdit: boolean;
  canPublish: boolean;
  canManageEditors: boolean;
  canDelete: boolean;
};

export type AgentPermission = AgentPermissionCapabilities & {
  isLoading: boolean;
  isError: boolean;
};

function noAgentCapabilities(): AgentPermissionCapabilities {
  return {
    isOwner: false,
    isEditor: false,
    canEdit: false,
    canPublish: false,
    canManageEditors: false,
    canDelete: false,
  };
}

function userIdentity(user: AgentPermissionIdentity | null): string | null {
  if (user?.username) {
    return user.username;
  }
  return user?.email ?? null;
}

export function deriveAgentPermission(
  snapshot: PermissionSnapshot,
  target: AgentPermissionTarget,
  user: AgentPermissionIdentity | null,
): AgentPermissionCapabilities {
  if (target.agentId === null) {
    return { ...noAgentCapabilities(), canEdit: true };
  }
  if (!agentIdSchema.safeParse(target.agentId).success || !userIdentity(user)) {
    return noAgentCapabilities();
  }
  const isOwner = sameIdentity(target.creatorUsername, userIdentity(user));
  const isEditor =
    snapshot.agentRoles.get(target.agentId)?.has("agent_editor") === true;
  return {
    isOwner,
    isEditor,
    canEdit: isOwner || isEditor,
    canPublish: isOwner || isEditor,
    canManageEditors: isOwner,
    canDelete: isOwner,
  };
}

export function useAgentPermission(
  target: AgentPermissionTarget,
): AgentPermission {
  const user = useAtomValue(userAtom);
  const { data } = usePermissionSnapshotSuspenseQuery();
  return {
    ...deriveAgentPermission(data, target, user),
    isLoading: false,
    isError: false,
  };
}
