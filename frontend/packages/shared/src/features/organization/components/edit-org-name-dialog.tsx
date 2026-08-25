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
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  toast,
} from "@sico/ui";
import { useEffect } from "react";
import type * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useRenameOrganization } from "../hooks/use-rename-organization";

const NAME_REQUIRED = msg({
  id: "organization.editName.validation.required",
  message: "Organization name is required",
});
const EDIT_ORGANIZATION_TITLE = msg({
  id: "organization.editName.title",
  message: "Edit Organization",
});

const editOrgNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: () => i18n._(NAME_REQUIRED) }),
});
type EditOrgNameValues = z.infer<typeof editOrgNameSchema>;

export type EditOrgNameDialogProps = {
  organizationId: number;
  currentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Rename the organization through the DWP API, then refresh its detail query. */
export function EditOrgNameDialog({
  organizationId,
  currentName,
  open,
  onOpenChange,
}: EditOrgNameDialogProps): React.JSX.Element {
  const { t } = useLingui();
  const rename = useRenameOrganization(organizationId);
  const form = useForm<EditOrgNameValues>({
    resolver: zodResolver(editOrgNameSchema),
    defaultValues: { name: currentName },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: currentName });
    }
  }, [open, currentName, form]);

  const onSubmit = (values: EditOrgNameValues): void => {
    rename.mutate(values.name, {
      onSuccess: () => {
        const successMessage = t({
          id: "organization.editName.success",
          message: "Organization name updated.",
        });
        toast.success(successMessage, { invert: true });
        onOpenChange(false);
      },
      onError: () =>
        toast.error(
          t({
            id: "organization.editName.failed",
            message: "Couldn't rename this organization.",
          }),
        ),
    });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="content" className="w-130">
        <DialogHeader>
          <DialogTitle>{t(EDIT_ORGANIZATION_TITLE)}</DialogTitle>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid ? true : undefined}>
                  <FieldLabel
                    htmlFor="edit-org-name"
                    className="text-xs font-semibold tracking-wider uppercase"
                  >
                    {t({
                      id: "organization.editName.label",
                      message: "Organization name",
                    })}
                  </FieldLabel>
                  <Input
                    id="edit-org-name"
                    aria-invalid={fieldState.invalid ? true : undefined}
                    name={field.name}
                    ref={field.ref}
                    value={field.value}
                    placeholder={t({
                      id: "organization.editName.placeholder",
                      message: "Enter organization name",
                    })}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                  {fieldState.error?.message && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="subtle"
              onClick={() => onOpenChange(false)}
            >
              {t({ id: "common.action.cancel", message: "Cancel" })}
            </Button>
            <Button type="submit" variant="primary" disabled={rename.isPending}>
              {t({ id: "common.action.save", message: "Save" })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
