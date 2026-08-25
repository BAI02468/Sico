import { zodResolver } from "@hookform/resolvers/zod";
import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  FieldGroup,
  toast,
} from "@sico/ui";
import { useAtomValue } from "jotai";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import type * as React from "react";
import { useForm } from "react-hook-form";

import { userAtom } from "../../../atoms/auth-atom";
import { apiErrorMessage } from "../../../utils/api-error-message";
import { AddDwDialogHeader } from "../../digital-worker/components/add-dw-dialog-header";
import {
  ADD_DW_INITIAL_VALUES,
  addDwSchema,
  type AddDwValues,
} from "../../digital-worker/components/add-dw-fields";
import { AvatarField } from "../../digital-worker/components/avatar-field";
import { DwField } from "../../digital-worker/components/dw-field";
import { NameField } from "../../digital-worker/components/name-field";
import { useCreateAgentInstanceMutation } from "../../digital-worker/hooks/use-create-agent-mutation";
import { deriveState } from "../../digital-worker/utils/load-state";
import { useAgentInfosQuery } from "../../studio/hooks/use-agent-infos-query";
import { type SingleAgentCard } from "../../studio/schemas/single-agent-card";
import { PLATFORM_AGENT_INFOS_INTENT } from "../../studio/services/single-agents";

export type InviteDwDialogProps = {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Imperative toast copy (module scope, non-React) resolved with `i18n._()` at
// toast time, so it follows the active locale without a component hook.
const MUST_SIGN_IN_COPY = msg({
  id: "team.inviteDw.error.mustSignIn",
  message: "You must be signed in to add a digital worker.",
});
const ADDED_COPY = msg({
  id: "team.inviteDw.success.added",
  message: "Digital Worker added.",
});
const ADD_FAILED_COPY = msg({
  id: "team.inviteDw.error.addFailed",
  message: "We couldn't add the digital worker.",
});

function submitInviteDw({
  values,
  userEmail,
  templates,
  projectId,
  mutate,
  onOpenChange,
}: {
  values: AddDwValues;
  userEmail: string | undefined;
  templates: SingleAgentCard[];
  projectId: number;
  mutate: ReturnType<typeof useCreateAgentInstanceMutation>["mutate"];
  onOpenChange: (open: boolean) => void;
}): void {
  if (!userEmail) {
    toast.error(i18n._(MUST_SIGN_IN_COPY));
    return;
  }
  const role = templates.find(
    (template) => template.agentId === values.agentId,
  )?.role;
  mutate(
    {
      agentId: values.agentId,
      name: values.name,
      role,
      iconUri: values.iconUri,
      employerUsername: userEmail,
      projectId,
    },
    {
      onSuccess: () => {
        toast.success(i18n._(ADDED_COPY), { invert: true });
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(apiErrorMessage(error, i18n._(ADD_FAILED_COPY)));
      },
    },
  );
}

/** Add a digital worker to THIS project (module3). Reuses the Add DW field
 * renderers but drops the project select — `projectId` comes from the route and
 * is seeded into the form (kept for renderer type-compat) then injected into the
 * create call. RHF + zodResolver + `@sico/ui` Field. */
export function InviteDwDialog({
  projectId,
  open,
  onOpenChange,
}: InviteDwDialogProps): React.JSX.Element {
  const { t } = useLingui();
  const user = useAtomValue(userAtom);
  const templatesQuery = useAgentInfosQuery(PLATFORM_AGENT_INFOS_INTENT);
  const templates = templatesQuery.data ?? [];
  const templatesState = deriveState(
    templatesQuery.isPending,
    templatesQuery.isError,
    templates.length,
  );
  // Seed projectId from the route so the select field can be omitted while the
  // shared renderers (typed to AddDwValues) still receive a compatible form.
  const initial: AddDwValues = useMemo(
    () => ({ ...ADD_DW_INITIAL_VALUES, projectId: String(projectId) }),
    [projectId],
  );
  const form = useForm<AddDwValues>({
    resolver: zodResolver(addDwSchema),
    defaultValues: initial,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const mutation = useCreateAgentInstanceMutation();

  useEffect(() => {
    if (open) {
      form.reset(initial);
    }
  }, [open, form, initial]);

  const handlePick = (card: SingleAgentCard | undefined): void => {
    if (card && !form.getFieldState("name").isDirty) {
      form.setValue("name", card.name);
    }
  };

  const onSubmit = (values: AddDwValues): void => {
    submitInviteDw({
      values,
      userEmail: user?.email,
      templates,
      projectId,
      mutate: mutation.mutate,
      onOpenChange,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="content" className="w-150">
        <AddDwDialogHeader />
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <DwField
              control={form.control}
              templates={templates}
              state={templatesState}
              onPick={handlePick}
            />
            <NameField control={form.control} />
            <AvatarField control={form.control} />
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="subtle"
              onClick={() => onOpenChange(false)}
            >
              {t({ id: "common.action.cancel", message: "Cancel" })}
            </Button>
            <Button
              type="submit"
              variant="primary"
              aria-busy={mutation.isPending}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
              {mutation.isPending
                ? t({ id: "common.status.saving", message: "Saving…" })
                : t({ id: "common.action.save", message: "Save" })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
