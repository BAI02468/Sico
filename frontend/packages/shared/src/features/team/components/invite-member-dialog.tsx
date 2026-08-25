import { zodResolver } from "@hookform/resolvers/zod";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  toast,
} from "@sico/ui";
import { ChevronDown, Loader2 } from "lucide-react";
import { useEffect } from "react";
import type * as React from "react";
import { type Control, Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { ProjectUserNotFoundError } from "../../membership";
import {
  type ProjectRoleCode,
  ProjectRoleCodeSchema,
} from "../../rbac/schemas/user-role";
import { useInviteMemberByEmailMutation } from "../hooks/use-invite-member-mutation";
import { useRoleLabels } from "../hooks/use-role-labels";

type InviteMemberValues = {
  email: string;
  roleCode: z.infer<typeof ProjectRoleCodeSchema>;
};

// Module-scope `msg()` descriptors (statically extractable); zod v4's `error`
// callback resolves them via `i18n._()` at validation time, so the schema is a
// plain module const in the active locale — no factory, no injected `t`.
const EMAIL_REQUIRED = msg({
  id: "team.inviteMember.validation.emailRequired",
  message: "Email is required",
});
const EMAIL_INVALID = msg({
  id: "team.inviteMember.validation.emailInvalid",
  message: "Enter a valid email",
});

const inviteMemberSchema = z.object({
  email: z
    .string()
    .min(1, { error: () => i18n._(EMAIL_REQUIRED) })
    .email({ error: () => i18n._(EMAIL_INVALID) }),
  roleCode: ProjectRoleCodeSchema,
});

const INITIAL: InviteMemberValues = {
  email: "",
  roleCode: ProjectRoleCodeSchema.enum.project_member,
};

export type InviteMemberDialogProps = {
  projectId: number;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Imperative toast copy (module scope, non-React) resolved with `i18n._()` at
// toast time, so it follows the active locale without a component hook.
const USER_NOT_REGISTERED_COPY = msg({
  id: "team.inviteMember.error.userNotRegistered",
  message: "This user isn't registered yet.",
});
const MEMBER_INVITED_COPY = msg({
  id: "team.inviteMember.success.memberInvited",
  message: "Member invited.",
});
const INVITE_FAILED_COPY = msg({
  id: "team.inviteMember.error.inviteFailed",
  message: "We couldn't invite this user.",
});

// Copy for the field row, resolved with the subscribed hook `t` so lingui
// extracts these ids statically and they retranslate on a locale switch (the
// render helpers below are plain functions, so a `translate` param would be
// invisible to the extractor). A hook so the component body stays under the
// line ceiling.
function useEmailRowCopy(): EmailRowCopy {
  const { t } = useLingui();
  const roleLabels = useRoleLabels();
  return {
    label: t({ id: "common.field.email", message: "Email" }),
    placeholder: t({
      id: "team.inviteMember.emailPlaceholder",
      message: "colleague@company.com",
    }),
    roleAria: t({ id: "team.inviteMember.roleAria", message: "Role" }),
    roleLabels,
  };
}

/** Invite an existing user to the project by email + role. */
export function InviteMemberDialog({
  projectId,
  projectName,
  open,
  onOpenChange,
}: InviteMemberDialogProps): React.JSX.Element {
  const { t } = useLingui();
  const mutation = useInviteMemberByEmailMutation(projectId);
  const emailRowCopy = useEmailRowCopy();
  const form = useForm<InviteMemberValues>({
    // Module-scope schema: zod v4's `error` callback resolves each message via
    // `i18n._()` at validation time, so it always reflects the active locale.
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: INITIAL,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    if (open) {
      form.reset(INITIAL);
    }
  }, [open, form]);

  const onSubmit = (values: InviteMemberValues): void => {
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(i18n._(MEMBER_INVITED_COPY), { invert: true });
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(
          i18n._(
            error instanceof ProjectUserNotFoundError
              ? USER_NOT_REGISTERED_COPY
              : INVITE_FAILED_COPY,
          ),
        );
      },
    });
  };

  const busy = mutation.isPending;
  const email = useWatch({ control: form.control, name: "email" });
  const hasEmail = email.trim().length > 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="content" className="w-120">
        <DialogHeader>
          <DialogTitle>
            {t({
              id: "team.inviteMember.title",
              message: `Invite to ${projectName}`,
            })}
          </DialogTitle>
        </DialogHeader>
        <form
          noValidate
          onSubmit={(e) => {
            void form.handleSubmit(onSubmit)(e);
          }}
        >
          <FieldGroup>{renderEmailRow(form.control, emailRowCopy)}</FieldGroup>
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
              aria-busy={busy}
              disabled={busy || !hasEmail}
            >
              {busy ? <Loader2 className="animate-spin" /> : null}
              {busy
                ? t({
                    id: "team.inviteMember.status.inviting",
                    message: "Inviting…",
                  })
                : t({
                    id: "team.inviteMember.action.invite",
                    message: "Invite",
                  })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Pre-translated copy for the email row, resolved by the component's hook `t`
// (these render helpers are plain functions — a `translate` param would escape
// lingui's static extraction).
type EmailRowCopy = {
  label: string;
  placeholder: string;
  roleAria: string;
  roleLabels: Record<ProjectRoleCode, string>;
};

// Email input with the role dropdown pinned inside its right edge (PR313). The
// email + role Controllers share the row; the input reserves right padding so
// text never slides under the dropdown trigger.
function renderEmailRow(
  control: Control<InviteMemberValues>,
  copy: EmailRowCopy,
): React.JSX.Element {
  return (
    <Controller
      name="email"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid ? true : undefined}>
          <FieldLabel htmlFor="invite-member-email">{copy.label}</FieldLabel>
          <div className="relative">
            <Input
              id="invite-member-email"
              type="email"
              placeholder={copy.placeholder}
              aria-invalid={fieldState.invalid ? true : undefined}
              className="pr-28"
              name={field.name}
              ref={field.ref}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
            {renderRoleDropdown(control, copy.roleAria, copy.roleLabels)}
          </div>
          {fieldState.error?.message && (
            <FieldError>{fieldState.error.message}</FieldError>
          )}
        </Field>
      )}
    />
  );
}

function renderRoleDropdown(
  control: Control<InviteMemberValues>,
  roleAria: string,
  roleLabels: Record<ProjectRoleCode, string>,
): React.JSX.Element {
  return (
    <Controller
      name="roleCode"
      control={control}
      render={({ field }) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="link"
                aria-label={roleAria}
                className="text-foreground-secondary hover:text-foreground-primary absolute top-1/2 right-0 h-auto -translate-y-1/2 gap-1 py-0 pr-3 pl-2 text-xs font-normal no-underline hover:no-underline"
              />
            }
          >
            {roleLabels[field.value]}
            <ChevronDown className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="!w-32">
            <DropdownMenuRadioGroup
              value={field.value}
              onValueChange={(v) =>
                field.onChange(ProjectRoleCodeSchema.parse(v))
              }
            >
              {ProjectRoleCodeSchema.options.map((code) => (
                <DropdownMenuRadioItem key={code} value={code} closeOnClick>
                  {roleLabels[code]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    />
  );
}
