import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { z } from "zod";

export const MAX_NAME_LENGTH = 20;
export const MAX_DESCRIPTION_LENGTH = 200;

// Module-scope `msg()` descriptors (statically extractable); the text resolves
// lazily via zod v4's `error` callback at validation time, so the schema is a
// plain module const — no factory, no injected `t`, and always in the active
// locale. The description cap carries a `{max}` placeholder filled at resolve
// time via the three-arg `i18n._(id, values, descriptor)` overload.
const NAME_REQUIRED = msg({
  id: "projects.createDialog.validation.nameRequired",
  message: "Name is required",
});
const NAME_TOO_LONG = msg({
  id: "projects.createDialog.validation.nameTooLong",
  message: "Name is too long",
});
const DESCRIPTION_TOO_LONG = msg({
  id: "projects.createDialog.validation.descriptionTooLong",
  message: "Description must be {max} characters or fewer",
});

// Backend caps name at ≤100. Description is capped at 200 characters
// (client-only, matching the design). A character cap (not word count) is used
// so the limit is meaningful for CJK text, which has no inter-word spaces.
// `iconUri` holds the eagerly-uploaded cover's relative `uri`.
export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, { error: () => i18n._(NAME_REQUIRED) })
    .max(MAX_NAME_LENGTH, { error: () => i18n._(NAME_TOO_LONG) }),
  description: z.string().max(MAX_DESCRIPTION_LENGTH, {
    error: () =>
      i18n._(
        DESCRIPTION_TOO_LONG.id,
        { max: MAX_DESCRIPTION_LENGTH },
        DESCRIPTION_TOO_LONG,
      ),
  }),
  iconUri: z.string().optional(),
});

export type CreateProjectValues = {
  name: string;
  description: string;
  iconUri?: string;
};

export const CREATE_PROJECT_INITIAL_VALUES: CreateProjectValues = {
  name: "",
  description: "",
  iconUri: undefined,
};
