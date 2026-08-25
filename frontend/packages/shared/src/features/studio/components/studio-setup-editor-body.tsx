import { useRef } from "react";
import type { UseFormReturn } from "react-hook-form";

import { type Role, SetupBasicInfo, SetupSkillSection } from "../../skill";
import type { SetupBasicInfoValues } from "../../skill/components/setup/setup-basic-info-values";
import type { StagedSkillDraft } from "../../skill/hooks/use-staged-skill-drafts";

export function StudioSetupEditorBody({
  form,
  roleOptions,
  creatorUsername,
  editable,
  agentId,
  initialStagedDrafts,
  onInitialDraftsConsumed,
  onSubmit,
}: {
  form: UseFormReturn<SetupBasicInfoValues>;
  roleOptions: Role[];
  creatorUsername?: string;
  editable: boolean;
  agentId?: string;
  initialStagedDrafts?: StagedSkillDraft[];
  onInitialDraftsConsumed?: () => void;
  onSubmit: ReturnType<UseFormReturn<SetupBasicInfoValues>["handleSubmit"]>;
}): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  return (
    <div
      ref={scrollRef}
      className="scrollbar min-h-0 flex-1 overflow-y-auto pb-6"
    >
      <div className="mx-auto flex min-h-full w-full max-w-230 flex-col gap-12 px-6 pt-2">
        <form id="studio-setup-form" onSubmit={onSubmit} noValidate>
          <SetupBasicInfo
            control={form.control}
            roleOptions={roleOptions}
            creatorUsername={creatorUsername}
            disabled={!editable}
          />
        </form>
        <SetupSkillSection
          agentId={agentId}
          rootRef={scrollRef}
          editable={editable}
          initialStagedDrafts={initialStagedDrafts}
          onInitialDraftsConsumed={onInitialDraftsConsumed}
        />
      </div>
    </div>
  );
}
