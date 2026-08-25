import { StudioSetupEditorContent } from "./studio-setup-editor-content";
import { type Role } from "../../skill";
import type { SetupBasicInfoValues } from "../../skill/components/setup/setup-basic-info-values";
import { SkillSaveRegistryProvider } from "../../skill/components/setup/skill-save-registry";
import type { StagedSkillDraft } from "../../skill/hooks/use-staged-skill-drafts";

export type StudioSetupEditorProps = {
  name: string;
  role: string;
  creatorUsername?: string;
  roleOptions: Role[];
  editable: boolean;
  canPublish?: boolean;
  canManageEditors?: boolean;
  canDelete?: boolean;
  agentId?: string;
  initialStagedDrafts?: StagedSkillDraft[];
  onBasicSave: (values: SetupBasicInfoValues) => Promise<string | void>;
  onCreated?: (
    agentId: string,
    failedDrafts: StagedSkillDraft[],
    openPublishAfterTransition: boolean,
  ) => Promise<void>;
  onInitialDraftsConsumed?: () => void;
  onPublish?: () => void;
  onManageEditors?: () => void;
  onDelete?: () => void;
};

export function StudioSetupEditor({
  name,
  role,
  creatorUsername,
  roleOptions,
  editable,
  canPublish = editable,
  canManageEditors = false,
  canDelete = false,
  agentId,
  initialStagedDrafts,
  onBasicSave,
  onCreated,
  onInitialDraftsConsumed,
  onPublish,
  onManageEditors,
  onDelete,
}: StudioSetupEditorProps): React.JSX.Element {
  return (
    <SkillSaveRegistryProvider>
      <StudioSetupEditorContent
        name={name}
        role={role}
        creatorUsername={creatorUsername}
        roleOptions={roleOptions}
        editable={editable}
        canPublish={canPublish}
        canManageEditors={canManageEditors}
        canDelete={canDelete}
        agentId={agentId}
        initialStagedDrafts={initialStagedDrafts}
        onBasicSave={onBasicSave}
        onCreated={onCreated}
        onInitialDraftsConsumed={onInitialDraftsConsumed}
        onPublish={onPublish}
        onManageEditors={onManageEditors}
        onDelete={onDelete}
      />
    </SkillSaveRegistryProvider>
  );
}
