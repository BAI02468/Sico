import { useLingui } from "@lingui/react/macro";
import { Input, Label, Textarea } from "@sico/ui";
import { cn } from "@sico/ui/lib/utils.ts";
import { ChevronDown, ChevronRight } from "lucide-react";
import { type ReactElement, useMemo, useState } from "react";

import type { SkillAction, SkillFile } from "../../schemas/skill";
import { CodeViewer } from "../file-explorer/code-viewer";

type ToolItemProps = {
  editable?: boolean;
  action: SkillAction;
  displayName?: string;
  defaultExpanded?: boolean;
  onChange: (action: SkillAction) => void;
};

// Editable parsed-tool expander (legacy SkillToolItem): collapsible header plus
// Name / Description / Advanced settings fields that patch the action upward.
export function ToolItem({
  editable = true,
  action,
  displayName,
  defaultExpanded = false,
  onChange,
}: ToolItemProps): ReactElement {
  const { t } = useLingui();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const patch = (next: Partial<SkillAction>): void =>
    onChange({ ...action, ...next });

  const advancedFile = useMemo<SkillFile>(
    () => ({
      path: "advanced-settings.json",
      content: action.advancedSettings,
    }),
    [action.advancedSettings],
  );

  return (
    <div className="border-stroke-subtle-card-rest bg-surface-canvas rounded-lg border px-4">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
        className="text-foreground-emphasis flex h-12 w-full items-center gap-1 text-left text-base font-medium"
      >
        <span>{displayName ?? action.name}</span>
        {expanded ? (
          <ChevronDown className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        )}
      </button>
      <div className={cn("flex-col gap-3 pb-4", expanded ? "flex" : "hidden")}>
        <div className="flex flex-col gap-2">
          <Label className="text-foreground-tertiary">
            {t({ id: "skill.toolItem.name", message: "Name" })}
          </Label>
          <Input
            placeholder={t({
              id: "skill.toolItem.enterToolName",
              message: "Enter tool name",
            })}
            className="bg-surface-basic"
            value={action.name}
            disabled={!editable}
            onChange={(event) => patch({ name: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-foreground-tertiary">
            {t({ id: "skill.toolItem.description", message: "Description" })}
          </Label>
          <Textarea
            placeholder={t({
              id: "skill.toolItem.describeTool",
              message: "Describe what this tool does",
            })}
            className="bg-surface-basic min-h-28"
            value={action.description}
            disabled={!editable}
            onChange={(event) => patch({ description: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-foreground-tertiary">
            {t({
              id: "skill.toolItem.advancedSettings",
              message: "Advanced settings",
            })}
          </Label>
          <div className="border-input-stroke-rest bg-surface-basic h-72 overflow-hidden rounded-lg border py-2">
            <CodeViewer
              file={advancedFile}
              editable={editable}
              onChange={(content) => patch({ advancedSettings: content })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
