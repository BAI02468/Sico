import { useLingui } from "@lingui/react/macro";
import { Button } from "@sico/ui";
import { X } from "lucide-react";

import { StudioEditorIdentityRow } from "./studio-editor-identity-row";
import type { RbacUser } from "../../rbac/schemas/user-role";

export function StudioEditorRoster({
  creatorUsername,
  editors,
  isPending,
  isError,
  disabled,
  onRetry,
  onRemove,
}: {
  creatorUsername: string;
  editors: RbacUser[];
  isPending: boolean;
  isError: boolean;
  disabled: boolean;
  onRetry: () => void;
  onRemove: (editor: RbacUser) => void;
}): React.JSX.Element {
  const { t } = useLingui();
  return (
    <div className="flex flex-col gap-2">
      <StudioEditorIdentityRow
        email={creatorUsername}
        role={t({ id: "studio.manageEditors.creator", message: "Creator" })}
      />
      {isPending ? (
        <p className="text-foreground-secondary text-sm">
          {t({ id: "common.status.loading", message: "Loading" })}
        </p>
      ) : null}
      {isError ? (
        <div role="alert" className="flex items-center gap-2">
          <p>
            {t({
              id: "studio.manageEditors.loadFailed",
              message: "Couldn't load editors.",
            })}
          </p>
          <Button type="button" variant="subtle" size="xs" onClick={onRetry}>
            {t({ id: "common.action.retry", message: "Retry" })}
          </Button>
        </div>
      ) : null}
      {editors.map((editor) => (
        <StudioEditorIdentityRow
          key={editor.id}
          email={editor.email}
          role={t({ id: "studio.manageEditors.editor", message: "Editor" })}
          user={editor}
          action={
            <Button
              type="button"
              variant="subtle"
              size="icon-xs"
              disabled={disabled}
              aria-label={t({
                id: "studio.manageEditors.removeEditor",
                message: `Remove ${editor.email}`,
              })}
              onClick={() => onRemove(editor)}
            >
              <X className="size-4" aria-hidden />
            </Button>
          }
        />
      ))}
    </div>
  );
}
