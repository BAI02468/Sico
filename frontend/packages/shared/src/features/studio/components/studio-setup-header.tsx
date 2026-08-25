import { useLingui } from "@lingui/react/macro";
import { Button } from "@sico/ui";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactElement, ReactNode } from "react";

import { StudioSetupHeaderActions } from "./studio-setup-header-actions";

export function StudioSetupHeader({
  editable,
  canPublish,
  canManageEditors = false,
  canDelete = false,
  showMoreActions = true,
  mode = "create",
  autosaveStatus,
  formId,
  saveDisabled,
  onPublish,
  onManageEditors,
  onDelete,
}: {
  editable: boolean;
  canPublish: boolean;
  canManageEditors?: boolean;
  canDelete?: boolean;
  showMoreActions?: boolean;
  mode?: "create" | "edit" | "read-only";
  autosaveStatus?: ReactNode;
  formId: string;
  saveDisabled: boolean;
  onPublish: () => void;
  onManageEditors?: () => void;
  onDelete?: () => void;
}): ReactElement {
  const { t } = useLingui();
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-4 px-4">
      <div className="flex min-w-0 items-center gap-1">
        <Link
          to="/studio"
          aria-label={t({
            id: "studio.setupHeader.backToStudio",
            message: "Back to Studio",
          })}
          className="text-foreground-secondary hover:text-foreground-primary inline-flex size-7 items-center justify-center rounded-md no-underline"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-foreground-primary truncate text-base font-medium">
          {t({
            id: "studio.setupHeader.title",
            message: "Digital Worker Setup",
          })}
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {mode === "create" ? (
          <Button
            type="submit"
            form={formId}
            variant="secondary"
            size="default"
            disabled={!editable || saveDisabled}
          >
            {t({ id: "common.action.save", message: "Save" })}
          </Button>
        ) : null}
        {mode === "edit" ? autosaveStatus : null}
        <Button
          type="button"
          variant="primary"
          size="default"
          disabled={!canPublish}
          onClick={onPublish}
        >
          {t({ id: "studio.setupHeader.publish", message: "Publish" })}
        </Button>
        {showMoreActions ? (
          <StudioSetupHeaderActions
            canManageEditors={canManageEditors}
            canDelete={canDelete}
            onManageEditors={onManageEditors}
            onDelete={onDelete}
          />
        ) : null}
      </div>
    </header>
  );
}
