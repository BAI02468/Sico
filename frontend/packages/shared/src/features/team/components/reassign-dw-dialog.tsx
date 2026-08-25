import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@sico/ui";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type * as React from "react";

import { FIELD_LABEL_CLASS } from "../../../constants/form";
import { apiErrorMessage } from "../../../utils/api-error-message";
import { useReassignAgentMutation } from "../../digital-worker/hooks/use-reassign-agent-mutation";
import { useProjectMembersQuery } from "../../membership";

// Imperative copy (方案 B): resolved at event time via `i18n._`, so these
// descriptors carry no locale subscription — correct for toast callbacks.
const REASSIGN_SUCCESS_COPY = msg({
  id: "team.reassignDwDialog.success.reassigned",
  message: "Digital Worker reassigned.",
});
const REASSIGN_FAILED_COPY = msg({
  id: "team.reassignDwDialog.error.reassignFailed",
  message: "We couldn't reassign this worker.",
});
const LOAD_MEMBERS_ERROR_COPY = msg({
  id: "team.reassignDwDialog.error.loadMembers",
  message: "We couldn't load members. Try reopening the dialog.",
});

export type ReassignDwDialogProps = {
  projectId: number;
  agentId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type MemberOption = {
  id: number;
  email: string;
  alias?: string | null;
};

function memberOptions(
  members: readonly MemberOption[],
): { value: string; label: string }[] {
  return members.map((member) => ({
    value: member.email,
    label: member.alias ?? member.email,
  }));
}

function runReassign({
  operator,
  agentId,
  mutate,
  onOpenChange,
}: {
  operator: string;
  agentId: number;
  mutate: ReturnType<typeof useReassignAgentMutation>["mutate"];
  onOpenChange: (open: boolean) => void;
}): void {
  const onSuccess = (): void => {
    toast.success(i18n._(REASSIGN_SUCCESS_COPY), { invert: true });
    onOpenChange(false);
  };

  const onError = (error: unknown): void => {
    toast.error(apiErrorMessage(error, i18n._(REASSIGN_FAILED_COPY)));
  };

  mutate(
    { id: agentId, newOperatorUsername: operator },
    { onSuccess, onError },
  );
}

function useMembersErrorToast(open: boolean, isError: boolean): void {
  const membersError = open && isError;

  useEffect(() => {
    if (membersError) {
      toast.error(i18n._(LOAD_MEMBERS_ERROR_COPY));
    }
  }, [membersError]);
}

// The Select's placeholder reflects the members-query state: loading, failed,
// empty, or ready-to-pick. A hook (not a plain helper) so it reads the
// locale-subscribed `t` and recomputes on a runtime locale switch.
function useMembersPlaceholder({
  isPending,
  isError,
  memberCount,
}: {
  isPending: boolean;
  isError: boolean;
  memberCount: number;
}): string {
  const { t } = useLingui();
  if (isPending) {
    return t({
      id: "team.reassignDwDialog.placeholder.loadingMembers",
      message: "Loading members…",
    });
  }
  if (isError) {
    return t({
      id: "team.reassignDwDialog.placeholder.loadMembersFailed",
      message: "Couldn't load members",
    });
  }
  if (memberCount === 0) {
    return t({
      id: "team.reassignDwDialog.placeholder.noMembers",
      message: "No members to reassign to",
    });
  }
  return t({
    id: "team.reassignDwDialog.placeholder.selectMember",
    message: "Select a member…",
  });
}

/** Reassign a digital worker to a new operator (module3). Operators are the
 * project's members; the selected member's email becomes `newOperatorUsername`. */
export function ReassignDwDialog({
  projectId,
  agentId,
  open,
  onOpenChange,
}: ReassignDwDialogProps): React.JSX.Element {
  const { t } = useLingui();
  const membersQuery = useProjectMembersQuery(projectId);
  const members = membersQuery.data ?? [];
  const options = memberOptions(members);
  const mutation = useReassignAgentMutation();
  const [operator, setOperator] = useState<string>("");
  useMembersErrorToast(open, membersQuery.isError);

  const placeholder = useMembersPlaceholder({
    isPending: membersQuery.isPending,
    isError: membersQuery.isError,
    memberCount: members.length,
  });

  const onConfirm = (): void => {
    if (!operator) {
      return;
    }
    runReassign({
      operator,
      agentId,
      mutate: mutation.mutate,
      onOpenChange,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="content" className="w-150">
        <DialogHeader>
          <DialogTitle>
            {t({
              id: "team.reassignDwDialog.title",
              message: "Reassign Digital Worker",
            })}
          </DialogTitle>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="reassign-operator" className={FIELD_LABEL_CLASS}>
            {t({
              id: "team.reassignDwDialog.newOperator",
              message: "New operator",
            })}
          </FieldLabel>
          <Select
            items={options}
            value={operator || null}
            onValueChange={(next) => setOperator(next ?? "")}
            disabled={membersQuery.isPending || membersQuery.isError}
          >
            <SelectTrigger id="reassign-operator" className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.email}>
                  {member.alias ?? member.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="subtle"
            onClick={() => onOpenChange(false)}
          >
            {t({ id: "team.reassignDwDialog.cancel", message: "Cancel" })}
          </Button>
          <Button
            type="button"
            variant="primary"
            aria-busy={mutation.isPending}
            disabled={mutation.isPending || !operator}
            onClick={onConfirm}
          >
            {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
            {mutation.isPending
              ? t({
                  id: "team.reassignDwDialog.reassigning",
                  message: "Reassigning…",
                })
              : t({
                  id: "team.reassignDwDialog.reassign",
                  message: "Reassign",
                })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
