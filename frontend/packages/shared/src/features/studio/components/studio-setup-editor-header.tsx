import type { ReactNode } from "react";

import { StudioSetupHeader } from "./studio-setup-header";

export function StudioSetupEditorHeader({
  editable,
  canPublish,
  canManageEditors,
  canDelete,
  mode,
  autosaveStatus,
  saveDisabled,
  onPublish,
  onManageEditors,
  onDelete,
}: {
  editable: boolean;
  canPublish: boolean;
  canManageEditors: boolean;
  canDelete: boolean;
  mode: "create" | "edit" | "read-only";
  autosaveStatus?: ReactNode;
  saveDisabled: boolean;
  onPublish: () => void;
  onManageEditors?: () => void;
  onDelete?: () => void;
}): React.JSX.Element {
  return (
    <StudioSetupHeader
      editable={editable}
      canPublish={canPublish}
      canManageEditors={canManageEditors}
      canDelete={canDelete}
      showMoreActions={onManageEditors !== undefined || onDelete !== undefined}
      mode={mode}
      autosaveStatus={autosaveStatus}
      formId="studio-setup-form"
      saveDisabled={saveDisabled}
      onPublish={onPublish}
      onManageEditors={onManageEditors}
      onDelete={onDelete}
    />
  );
}
