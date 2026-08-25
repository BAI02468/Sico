import { zodResolver } from "@hookform/resolvers/zod";
import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
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
import { Loader2 } from "lucide-react";
import { Suspense, useEffect } from "react";
import type * as React from "react";
import { type Control, Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { AddKnowledgeTagArea } from "./add-knowledge-tag-area";
import { AddKnowledgeTagAreaSkeleton } from "./add-knowledge-tag-area-skeleton";
import { useAssetMutation } from "../hooks/use-asset-mutation";
import type { KnowledgeRow } from "../types";

// FORM schema (not the domain schema): the dialog edits `name` plus the set of
// knowledge-tag `tagIds`. This is the read→write asymmetry seam (§8) — the
// asset READS `tags[] {id,name}`, but `PUT /knowledge/document` WRITES
// `tagIds[]`, so the dialog seeds `tagIds` from `asset.tags.map(t => t.id)` and
// submits the ids straight through.

// Module-scope `msg()` descriptor (statically extractable); zod v4's `error`
// callback resolves it via `i18n._()` at validation time, so the schema is a
// plain module const in the active locale — no factory, no injected `t`.
const NAME_REQUIRED = msg({
  id: "projects.editAsset.nameRequired",
  message: "Name is required",
});

const editAssetFormSchema = z.object({
  name: z.string().min(1, { error: () => i18n._(NAME_REQUIRED) }),
  tagIds: z.array(z.number()),
});
type EditAssetFormValues = z.infer<typeof editAssetFormSchema>;

// Render helpers — plain module-scope functions (NOT nested components, so
// `react/no-unstable-nested-components` never fires and ONE component lives in
// this file). RHF `field` is wired prop-by-prop, mirroring the dialog
// precedents, because `react/jsx-props-no-spreading` forbids `{...field}`.

function renderNameField(
  control: Control<EditAssetFormValues>,
): React.JSX.Element {
  return (
    <Controller
      name="name"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid ? true : undefined}>
          <FieldLabel htmlFor="edit-asset-name" className="text-base">
            <Trans id="projects.editAsset.knowledgeName">Knowledge name</Trans>
          </FieldLabel>
          <Input
            id="edit-asset-name"
            aria-invalid={fieldState.invalid ? true : undefined}
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

// The "Knowledge tag" area is the shared `<AddKnowledgeTagArea>` (removable
// chips + `+ Add tag`) driven by the `tagIds` field. A `<Controller>` supplies
// `value`/`onChange` prop-by-prop — the same prop-by-prop wiring as the name
// field, and it avoids `form.watch()` (which the React Compiler can't memoize).
// The area reads `useKnowledgeTagsQuery` (SUSPENDS), so it sits behind a local
// `<Suspense>` while the name field + footer render immediately (mirrors
// asset-detail).
function renderTagArea(
  control: Control<EditAssetFormValues>,
  projectId: number,
): React.JSX.Element {
  return (
    <Controller
      name="tagIds"
      control={control}
      render={({ field }) => (
        <Suspense fallback={<AddKnowledgeTagAreaSkeleton />}>
          <AddKnowledgeTagArea
            projectId={projectId}
            value={field.value}
            onChange={field.onChange}
          />
        </Suspense>
      )}
    />
  );
}

export type EditAssetDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  /** The Knowledge row being edited — only Knowledge is editable (§9). */
  asset: KnowledgeRow;
};

/**
 * Controlled dialog to rename a Knowledge asset and edit its knowledge-tag
 * tags. Two fields — a `name` text input and the shared `<AddKnowledgeTagArea>`
 * (removable chips + `+ Add tag`). The tag area reads `useKnowledgeTagsQuery`
 * (which SUSPENDS), so it sits behind a LOCAL `<Suspense>` and the name field
 * + footer render immediately.
 *
 * Owns the read→write asymmetry (§8): seeds `tagIds` from `asset.tags.map(t =>
 * t.id)` and submits `{ id, name, tagIds }` to `useAssetMutation().edit`. On
 * success it toasts `"Your changes are saved."` (the hook only invalidates the
 * assets list) and closes.
 */
export function EditAssetDialog({
  open,
  onOpenChange,
  projectId,
  asset,
}: EditAssetDialogProps): React.JSX.Element {
  const { t } = useLingui();
  const form = useForm<EditAssetFormValues>({
    resolver: zodResolver(editAssetFormSchema),
    defaultValues: {
      name: asset.name,
      tagIds: asset.tags.map((tag) => tag.id),
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { edit } = useAssetMutation(projectId);

  // Re-seed whenever the dialog opens so re-opening on a different asset shows
  // fresh name + tags. Keyed on the asset's stable field values (id, name, and
  // the joined tag-id list) — NOT the `asset`/`tags` object — so a parent that
  // re-creates the row each render can't clobber an in-progress edit. The ids
  // are reconstructed from the string key inside the effect so the dependency
  // list references only stable primitives.
  const tagIdsKey = asset.tags.map((tag) => tag.id).join(",");
  useEffect(() => {
    if (open) {
      const seededTagIds =
        tagIdsKey === "" ? [] : tagIdsKey.split(",").map(Number);
      form.reset({ name: asset.name, tagIds: seededTagIds });
    }
  }, [open, asset.id, asset.name, tagIdsKey, form]);

  const onSubmit = (values: EditAssetFormValues): void => {
    edit.mutate(
      { id: asset.id, name: values.name, tagIds: values.tagIds },
      {
        onSuccess: () => {
          toast.success(
            t({
              id: "projects.editAsset.saveSuccess",
              message: "Your changes are saved.",
            }),
            { invert: true },
          );
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="content" className="w-150">
        <DialogHeader>
          <DialogTitle>
            <Trans id="projects.editAsset.title">Edit</Trans>
          </DialogTitle>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {renderNameField(form.control)}
            {renderTagArea(form.control, projectId)}
          </FieldGroup>
          <DialogFooter className="mt-6">
            {edit.isError && (
              <FieldError>
                <Trans id="projects.editAsset.saveError">
                  We couldn&apos;t save your changes. Try again.
                </Trans>
              </FieldError>
            )}
            <Button
              type="button"
              variant="subtle"
              onClick={() => onOpenChange(false)}
            >
              <Trans id="projects.editAsset.cancel">Cancel</Trans>
            </Button>
            <Button
              type="submit"
              variant="primary"
              aria-busy={edit.isPending}
              disabled={edit.isPending}
            >
              {edit.isPending ? <Loader2 className="animate-spin" /> : null}
              {edit.isPending ? (
                <Trans id="projects.editAsset.saving">Saving…</Trans>
              ) : (
                <Trans id="projects.editAsset.save">Save</Trans>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
