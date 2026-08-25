import type { ReactElement } from "react";

import { StudioAutosaveStatus } from "./studio-autosave-status";
import { StudioSetupEditorHeader } from "./studio-setup-editor-header";
import type { SaveQueueStatus } from "../../../hooks/use-latest-save-queue";

export function StudioSetupEditorAutosaveHeader({
  editable,
  editMode,
  canPublish,
  canManageEditors,
  canDelete,
  status,
  valid,
  canRetry,
  saveDisabled,
  onRetry,
  onDiscard,
  canDiscard,
  onConflict,
  onPublish,
  onManageEditors,
  onDelete,
}: {
  editable: boolean;
  editMode: boolean;
  canPublish: boolean;
  canManageEditors: boolean;
  canDelete: boolean;
  status: SaveQueueStatus;
  valid: boolean;
  canRetry: boolean;
  saveDisabled: boolean;
  onRetry: () => void;
  onDiscard: () => void;
  canDiscard: boolean;
  onConflict: () => void;
  onPublish: () => void;
  onManageEditors?: () => void;
  onDelete?: () => void;
}): ReactElement {
  let mode: "create" | "edit" | "read-only" = "create";
  if (editMode) {
    mode = editable ? "edit" : "read-only";
  }
  return (
    <StudioSetupEditorHeader
      editable={editable}
      canPublish={canPublish}
      canManageEditors={canManageEditors}
      canDelete={canDelete}
      mode={mode}
      autosaveStatus={
        <StudioAutosaveStatus
          status={status}
          valid={valid}
          canRetry={canRetry}
          onRetry={onRetry}
          onDiscard={onDiscard}
          canDiscard={canDiscard}
          onConflict={onConflict}
        />
      }
      saveDisabled={saveDisabled}
      onPublish={onPublish}
      onManageEditors={onManageEditors}
      onDelete={onDelete}
    />
  );
}
