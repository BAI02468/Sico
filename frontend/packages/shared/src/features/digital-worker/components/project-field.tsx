import { useLingui } from "@lingui/react/macro";
import {
  Field,
  FieldError,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@sico/ui";
import { ArrowUpRight } from "lucide-react";
import type * as React from "react";
import { type Control, Controller } from "react-hook-form";

import { type AddDwValues } from "./add-dw-fields";
import { StatusRow } from "./status-row";
import { ProjectAvatar } from "../../../components/project-avatar";
import { FIELD_LABEL_CLASS } from "../../../constants/form";
import { type Project } from "../../projects/schemas/project";
import { type LoadState, placeholderFor } from "../utils/load-state";

type ProjectFieldProps = {
  control: Control<AddDwValues>;
  projects: Project[];
  state: LoadState;
  onCreate: () => void;
};

export function ProjectField({
  control,
  projects,
  state,
  onCreate,
}: ProjectFieldProps): React.JSX.Element {
  const { t } = useLingui();
  const placeholder = placeholderFor(
    state,
    t({
      id: "digitalWorker.addDialog.projectPlaceholder",
      message: "Select a project…",
    }),
    t({
      id: "digitalWorker.addDialog.projectsNoun",
      message: "projects",
    }),
  );
  return (
    <Controller
      name="projectId"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid ? true : undefined}>
          <FieldLabel htmlFor="add-dw-project" className={FIELD_LABEL_CLASS}>
            {t({
              id: "digitalWorker.addDialog.projectLabel",
              message: "Project",
            })}
          </FieldLabel>
          <Select
            value={field.value || null}
            onValueChange={(next) => field.onChange(next ?? "")}
            disabled={state === "loading" || state === "error"}
          >
            <SelectTrigger id="add-dw-project" className="w-full pl-3">
              <SelectValue placeholder={placeholder}>
                {(value: string | null) => {
                  const project = projects.find((p) => String(p.id) === value);
                  return project ? (
                    <>
                      <ProjectAvatar project={project} size="xs" decorative />
                      {project.name}
                    </>
                  ) : (
                    placeholder
                  );
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              // pb-0 removes the base p-1 bottom padding so the sticky "Create
              // Project" footer sits flush at the bottom — otherwise the 4px
              // padding shows the popover background below it ("漏底").
              className="scrollbar max-h-[min(var(--available-height),--spacing(85))] pb-0"
            >
              {state === "empty" ? (
                <StatusRow>
                  {t({
                    id: "digitalWorker.addDialog.projectsEmpty",
                    message: "No projects yet — create your first one.",
                  })}
                </StatusRow>
              ) : (
                projects.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    <ProjectAvatar project={p} size="xs" decorative />
                    {p.name}
                  </SelectItem>
                ))
              )}
              <button
                type="button"
                onClick={onCreate}
                className="text-foreground-secondary hover:bg-surface-raised focus-visible:bg-surface-raised border-stroke-subtle-card-rest bg-popover sticky bottom-0 z-10 flex h-10 w-full items-center rounded-b-lg border-t px-3 text-sm outline-hidden"
              >
                {t({
                  id: "digitalWorker.addDialog.createProjectButton",
                  message: "Create Project",
                })}
                <ArrowUpRight className="ml-1 size-4 shrink-0" />
              </button>
            </SelectContent>
          </Select>
          {state === "error" && (
            <FieldError>
              {t({
                id: "digitalWorker.addDialog.projectsLoadError",
                message: "Couldn't load projects. Try reopening the dialog.",
              })}
            </FieldError>
          )}
          {fieldState.error?.message && (
            <FieldError>{fieldState.error.message}</FieldError>
          )}
        </Field>
      )}
    />
  );
}
