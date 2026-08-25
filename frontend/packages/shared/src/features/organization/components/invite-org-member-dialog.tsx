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
  FieldGroup,
  toast,
} from "@sico/ui";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import type * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { InviteEmailField } from "./invite-email-field";
import { InviteRoleField } from "./invite-role-field";
import { OrganizationUserNotFoundError } from "../../membership";
import { OrganizationRoleCodeSchema } from "../../rbac/schemas/user-role";
import { useInviteOrganizationMember } from "../hooks/use-invite-organization-member";

const EMAIL_REQUIRED = msg({
  id: "organization.invite.validation.emailRequired",
  message: "Email is required",
});
const EMAIL_INVALID = msg({
  id: "organization.invite.validation.emailInvalid",
  message: "Enter a valid email",
});

const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: () => i18n._(EMAIL_REQUIRED) })
    .email({ error: () => i18n._(EMAIL_INVALID) }),
  role: OrganizationRoleCodeSchema,
});
export type InviteValues = z.infer<typeof inviteSchema>;
const INITIAL: InviteValues = { email: "", role: "org_member" };

export type InviteMemberDialogProps = {
  organizationId: number;
  orgName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InviteMemberDialog({
  organizationId,
  orgName,
  open,
  onOpenChange,
}: InviteMemberDialogProps): React.JSX.Element {
  const { t } = useLingui();
  const invite = useInviteOrganizationMember(organizationId);
  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: INITIAL,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    if (open) {
      form.reset(INITIAL);
    }
  }, [open, form]);

  const onSubmit = (values: InviteValues): void => {
    invite.mutate(values, {
      onSuccess: () => {
        toast.success(
          t({ id: "organization.invite.success", message: "Invite sent." }),
          { invert: true },
        );
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(
          error instanceof OrganizationUserNotFoundError
            ? t({
                id: "organization.invite.userNotFound",
                message: "This user hasn't registered yet.",
              })
            : t({
                id: "organization.invite.failed",
                message: "Couldn't invite this user.",
              }),
        );
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="content" className="w-130">
        <DialogHeader>
          <DialogTitle>
            {t({
              id: "organization.invite.title",
              message: `Invite to ${orgName}`,
            })}
          </DialogTitle>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <InviteEmailField control={form.control} />
            <InviteRoleField control={form.control} />
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
              aria-busy={invite.isPending}
              disabled={invite.isPending}
            >
              {invite.isPending ? <Loader2 className="animate-spin" /> : null}
              {t({ id: "organization.invite.send", message: "Invite" })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
