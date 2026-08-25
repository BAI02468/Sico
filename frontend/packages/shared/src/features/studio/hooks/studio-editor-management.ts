import { useLingui } from "@lingui/react/macro";
import { toast } from "@sico/ui";
import {
  useMutation,
  type UseMutationResult,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import { useAtomValue } from "jotai";
import { type Dispatch, type SetStateAction, useState } from "react";
import { z } from "zod";

import { userAtom } from "../../../atoms/auth-atom";
import { useApiClient } from "../../../services/api-client-context";
import { sameIdentity } from "../../projects/utils/same-identity";
import { rbacKeys } from "../../rbac/query-keys";
import type { RbacUser } from "../../rbac/schemas/user-role";
import {
  assignUserRole,
  findUserByEmail,
  listUsersByRole,
  removeUserRole,
} from "../../rbac/services/user-role";

const EDITORS_QUERY_KEY_PREFIX = "studio-agent-editors";
const editorEmailSchema = z.string().trim().email();

type EditorTarget = {
  agentId: string;
  creatorUsername: string;
};

type EditorRosterState = {
  query: UseQueryResult<RbacUser[]>;
  editors: RbacUser[];
  invalidate: () => Promise<unknown>;
};

type EditorInviteState = {
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  error: string | null;
  mutation: UseMutationResult<void, Error, string>;
  submit: () => void;
};

type InviteEditorInput = {
  apiClient: AxiosInstance;
  target: EditorTarget;
  editors: RbacUser[];
  email: string;
};

type EditorRemovalState = {
  editorToRemove: RbacUser | null;
  setEditorToRemove: Dispatch<SetStateAction<RbacUser | null>>;
  mutation: UseMutationResult<void, Error, RbacUser>;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function matchesCreator(user: RbacUser, creatorUsername: string): boolean {
  return (
    sameIdentity(user.username, creatorUsername) ||
    sameIdentity(user.email, creatorUsername)
  );
}

export function useStudioEditorRoster(
  target: EditorTarget,
  open: boolean,
): EditorRosterState {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const currentUser = useAtomValue(userAtom);
  const query = useQuery({
    queryKey: [EDITORS_QUERY_KEY_PREFIX, target.agentId],
    queryFn: () =>
      listUsersByRole(apiClient, {
        roleCode: "agent_editor",
        scopeType: "agent",
        scopeId: target.agentId,
      }),
    enabled: open,
  });
  const invalidate = (): Promise<unknown> =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: [EDITORS_QUERY_KEY_PREFIX, target.agentId],
      }),
      queryClient.invalidateQueries({
        queryKey: rbacKeys.userRoles(currentUser?.id ?? null),
      }),
    ]);
  const editors = (query.data ?? []).filter(
    (editor) => !matchesCreator(editor, target.creatorUsername),
  );
  return { query, editors, invalidate };
}

function useInviteError() {
  const { t } = useLingui();
  return (error: Error): string => {
    if (error.message === "creator") {
      return t({
        id: "studio.manageEditors.creatorCannotBeEditor",
        message: "The creator already has access.",
      });
    }
    if (error.message === "duplicate") {
      return t({
        id: "studio.manageEditors.alreadyEditor",
        message: "This person is already an editor.",
      });
    }
    if (error.message === "not-found") {
      return t({
        id: "studio.manageEditors.userNotFound",
        message: "No user found with that email address.",
      });
    }
    return t({
      id: "studio.manageEditors.inviteFailed",
      message: "Couldn't add this editor.",
    });
  };
}

async function inviteEditor({
  apiClient,
  target,
  editors,
  email,
}: InviteEditorInput): Promise<void> {
  if (email === normalizeEmail(target.creatorUsername)) {
    throw new Error("creator");
  }
  if (editors.some((editor) => normalizeEmail(editor.email) === email)) {
    throw new Error("duplicate");
  }
  const user = await findUserByEmail(apiClient, email);
  if (user === null) {
    throw new Error("not-found");
  }
  if (matchesCreator(user, target.creatorUsername)) {
    throw new Error("creator");
  }
  if (
    editors.some(
      (editor) => normalizeEmail(editor.email) === normalizeEmail(user.email),
    )
  ) {
    throw new Error("duplicate");
  }
  await assignUserRole(apiClient, {
    userId: user.id,
    roleCode: "agent_editor",
    scopeType: "agent",
    scopeId: target.agentId,
  });
}

export function useStudioEditorInvite(
  target: EditorTarget,
  editors: RbacUser[],
  invalidate: () => Promise<unknown>,
): EditorInviteState {
  const { t } = useLingui();
  const apiClient = useApiClient();
  const inviteErrorFor = useInviteError();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (inviteEmail: string) =>
      inviteEditor({ apiClient, target, editors, email: inviteEmail }),
    onSuccess: async () => {
      setEmail("");
      setError(null);
      await invalidate();
    },
    onError: (inviteError) => setError(inviteErrorFor(inviteError)),
  });
  const submit = (): void => {
    const normalized = normalizeEmail(email);
    if (normalized === "") {
      setError(
        t({
          id: "studio.manageEditors.emailRequired",
          message: "Enter an email address.",
        }),
      );
    } else if (!editorEmailSchema.safeParse(normalized).success) {
      setError(
        t({
          id: "studio.manageEditors.emailInvalid",
          message: "Enter a valid email address.",
        }),
      );
    } else {
      setError(null);
      mutation.mutate(normalized);
    }
  };
  return { email, setEmail, error, mutation, submit };
}

export function useStudioEditorRemoval(
  agentId: string,
  invalidate: () => Promise<unknown>,
): EditorRemovalState {
  const { t } = useLingui();
  const apiClient = useApiClient();
  const [editorToRemove, setEditorToRemove] = useState<RbacUser | null>(null);
  const mutation = useMutation({
    mutationFn: (editor: RbacUser) =>
      removeUserRole(apiClient, {
        userId: editor.id,
        roleCode: "agent_editor",
        scopeType: "agent",
        scopeId: agentId,
      }),
    onSuccess: async () => {
      setEditorToRemove(null);
      await invalidate();
    },
    onError: () =>
      toast.error(
        t({
          id: "studio.manageEditors.removeFailed",
          message: "Couldn't remove this editor.",
        }),
      ),
  });
  return { editorToRemove, setEditorToRemove, mutation };
}
