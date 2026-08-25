import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@sico/ui";
import { FileCode, X } from "lucide-react";
import type { ReactElement } from "react";

import type { StagedSkillDraft } from "../../hooks/use-staged-skill-drafts";

export function StagedSkillDraftList({
  drafts,
  editable = true,
  onRemove,
  onRetry,
}: {
  drafts: StagedSkillDraft[];
  editable?: boolean;
  onRemove: (id: string) => void;
  onRetry?: ((id: string) => void) | undefined;
}): ReactElement | null {
  const { t } = useLingui();
  if (drafts.length === 0) {
    return null;
  }

  const statusLabels = {
    failed: t({ id: "skill.stagedDraft.failed", message: "Failed" }),
    pending: t({ id: "skill.stagedDraft.pending", message: "Pending" }),
    saved: t({ id: "skill.stagedDraft.saved", message: "Saved" }),
    saving: t({ id: "skill.stagedDraft.pending", message: "Pending" }),
  };

  return (
    <ul className="flex flex-col gap-2">
      {drafts.map((draft) => (
        <li
          key={draft.id}
          className="border-divider flex h-11 items-center gap-2 rounded-lg border px-3"
        >
          <FileCode className="text-foreground-secondary size-5 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-sm">
            {draft.file.name}
          </span>
          <span className="text-foreground-tertiary text-xs">
            {statusLabels[draft.status]}
          </span>
          {draft.status === "failed" && onRetry ? (
            <Button
              type="button"
              variant="link"
              size="xs"
              onClick={() => onRetry(draft.id)}
            >
              <Trans id="common.action.retry">Retry</Trans>
            </Button>
          ) : null}
          <Button
            variant="subtle"
            size="icon-xs"
            disabled={!editable || draft.status === "saving"}
            aria-label={t({
              id: "skill.stagedDraft.remove",
              message: "Remove skill",
            })}
            onClick={() => onRemove(draft.id)}
          >
            <X />
          </Button>
        </li>
      ))}
    </ul>
  );
}
