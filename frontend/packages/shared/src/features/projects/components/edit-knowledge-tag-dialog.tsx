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
  toast,
} from "@sico/ui";
import { Loader2 } from "lucide-react";
import { useLayoutEffect } from "react";
import type * as React from "react";
import { type Control, Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { CharCountInput } from "../../../components/char-count-input";
import { CharCountTextarea } from "../../../components/char-count-textarea";
import { useKnowledgeTagMutation } from "../hooks/use-knowledge-tag-mutation";
import type { KnowledgeTag } from "../schemas/knowledge-tag";

const NAME_MAX = 20;
const WHEN_TO_USE_MAX = 100;

const NAME_REQUIRED = msg({
  id: "projects.knowledgeTagDialog.validation.nameRequired",
  message: "Name is required",
});
const NAME_TOO_LONG = msg({
  id: "projects.knowledgeTagDialog.validation.nameTooLong",
  message: "Name is too long",
});
const WHEN_TO_USE_TOO_LONG = msg({
  id: "projects.knowledgeTagDialog.validation.whenToUseTooLong",
  message: "When to use is too long",
});

// `whenToUse` maps to the domain `description` at submit. Inputs hard-cap via
// `maxLength`; zod `.max()` backstops pre-seeded over-limit Edit values.
const editKnowledgeTagFormSchema = z.object({
  name: z
    .string()
    .min(1, { error: () => i18n._(NAME_REQUIRED) })
    .max(NAME_MAX, { error: () => i18n._(NAME_TOO_LONG) }),
  whenToUse: z
    .string()
    .max(WHEN_TO_USE_MAX, { error: () => i18n._(WHEN_TO_USE_TOO_LONG) }),
});
type EditKnowledgeTagFormValues = z.infer<typeof editKnowledgeTagFormSchema>;

type KnowledgeTagDialogCopy = {
  name: string;
  namePlaceholder: string;
  whenToUse: string;
  whenToUsePlaceholder: string;
  addTitle: string;
  editTitle: string;
  saveSuccess: string;
  saveError: string;
  cancel: string;
  saving: string;
  save: string;
};

// Module-scope helpers + prop-by-prop wiring satisfy no-unstable-nested-
// components / jsx-props-no-spreading.
function renderNameField(
  control: Control<EditKnowledgeTagFormValues>,
  copy: KnowledgeTagDialogCopy,
): React.JSX.Element {
  return (
    <Controller
      name="name"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid ? true : undefined}>
          <FieldLabel htmlFor="edit-knowledge-tag-name" className="text-base">
            {copy.name}
          </FieldLabel>
          <CharCountInput
            id="edit-knowledge-tag-name"
            placeholder={copy.namePlaceholder}
            autoComplete="off"
            max={NAME_MAX}
            ariaInvalid={fieldState.invalid ? true : undefined}
            name={field.name}
            ref={field.ref}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
          />
          {fieldState.error?.message && (
            <FieldError>{fieldState.error.message}</FieldError>
          )}
        </Field>
      )}
    />
  );
}

function renderWhenToUseField(
  control: Control<EditKnowledgeTagFormValues>,
  copy: KnowledgeTagDialogCopy,
): React.JSX.Element {
  return (
    <Controller
      name="whenToUse"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid ? true : undefined}>
          <FieldLabel
            htmlFor="edit-knowledge-tag-when-to-use"
            className="text-base"
          >
            {copy.whenToUse}
          </FieldLabel>
          <CharCountTextarea
            id="edit-knowledge-tag-when-to-use"
            className="min-h-48"
            placeholder={copy.whenToUsePlaceholder}
            autoComplete="off"
            max={WHEN_TO_USE_MAX}
            ariaInvalid={fieldState.invalid ? true : undefined}
            name={field.name}
            ref={field.ref}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
          />
          {fieldState.error?.message && (
            <FieldError>{fieldState.error.message}</FieldError>
          )}
        </Field>
      )}
    />
  );
}

export type EditKnowledgeTagDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  /** Present → Edit an existing knowledge tag; omitted → Add a new one. */
  knowledgeTag?: KnowledgeTag;
};

function useKnowledgeTagDialogCopy(): KnowledgeTagDialogCopy {
  const { t } = useLingui();
  return {
    name: t({ id: "projects.knowledgeTagDialog.name", message: "Name" }),
    namePlaceholder: t({
      id: "projects.knowledgeTagDialog.namePlaceholder",
      message: "Name this knowledge tag",
    }),
    whenToUse: t({
      id: "projects.knowledgeTagDialog.whenToUse",
      message: "When to use",
    }),
    whenToUsePlaceholder: t({
      id: "projects.knowledgeTagDialog.whenToUsePlaceholder",
      message: "Describe when your digital workers should use this tag.",
    }),
    addTitle: t({
      id: "projects.knowledgeTagDialog.addTitle",
      message: "Add knowledge tag",
    }),
    editTitle: t({
      id: "projects.knowledgeTagDialog.editTitle",
      message: "Edit knowledge tag",
    }),
    saveSuccess: t({
      id: "projects.knowledgeTagDialog.saveSuccess",
      message: "Knowledge tag saved.",
    }),
    saveError: t({
      id: "projects.knowledgeTagDialog.saveError",
      message: "We couldn't save your changes. Try again.",
    }),
    cancel: t({ id: "common.action.cancel", message: "Cancel" }),
    saving: t({ id: "common.action.saving", message: "Saving…" }),
    save: t({ id: "common.action.save", message: "Save" }),
  };
}

/** Controlled Add/Edit dialog — `knowledgeTag` decides the mode. */
export function EditKnowledgeTagDialog({
  open,
  onOpenChange,
  projectId,
  knowledgeTag,
}: EditKnowledgeTagDialogProps): React.JSX.Element {
  const copy = useKnowledgeTagDialogCopy();
  const form = useForm<EditKnowledgeTagFormValues>({
    resolver: zodResolver(editKnowledgeTagFormSchema),
    defaultValues: {
      name: knowledgeTag?.name ?? "",
      whenToUse: knowledgeTag?.description ?? "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { create, edit } = useKnowledgeTagMutation(projectId);
  const pending = knowledgeTag ? edit.isPending : create.isPending;

  // Re-seed on open, keyed on the tag's fields (not the object) so a re-created
  // prop can't clobber an edit. `useLayoutEffect` runs before paint so the
  // persistently-mounted dialog never flashes the previous open's values.
  useLayoutEffect(() => {
    if (open) {
      form.reset({
        name: knowledgeTag?.name ?? "",
        whenToUse: knowledgeTag?.description ?? "",
      });
    }
  }, [
    open,
    knowledgeTag?.id,
    knowledgeTag?.name,
    knowledgeTag?.description,
    form,
  ]);

  const onSubmit = (values: EditKnowledgeTagFormValues): void => {
    const onSuccess = (): void => {
      toast.success(copy.saveSuccess, { invert: true });
      onOpenChange(false);
    };
    // Keep the dialog open on failure so input survives for a retry.
    const onError = (): void => {
      toast.error(copy.saveError);
    };
    if (knowledgeTag) {
      edit.mutate(
        {
          id: knowledgeTag.id,
          name: values.name,
          description: values.whenToUse,
        },
        { onSuccess, onError },
      );
    } else {
      create.mutate(
        { projectId, name: values.name, description: values.whenToUse },
        { onSuccess, onError },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="content" className="w-150">
        <DialogHeader>
          <DialogTitle>
            {knowledgeTag ? copy.editTitle : copy.addTitle}
          </DialogTitle>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {renderNameField(form.control, copy)}
            {renderWhenToUseField(form.control, copy)}
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="subtle"
              onClick={() => onOpenChange(false)}
            >
              {copy.cancel}
            </Button>
            <Button
              type="submit"
              variant="primary"
              aria-busy={pending}
              disabled={pending}
            >
              {pending ? <Loader2 className="animate-spin" /> : null}
              {pending ? copy.saving : copy.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
