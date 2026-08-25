import { useLingui } from "@lingui/react/macro";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@sico/ui";
import { MoreHorizontal, Trash2, UserRoundCog } from "lucide-react";
import type * as React from "react";

import { ConfirmDialog } from "../../../components/confirm-dialog";
import { type Agent } from "../../digital-worker/schemas/agent";
import { GatedMenuItem } from "../../projects/components/gated-menu-item";
import { useDismissAgent } from "../hooks/use-dismiss-agent";

export type DwActionsCellProps = {
  agent: Agent;
  /** dw.manage — may reassign. */
  canReassign: boolean;
  /** dw.manage, or dw.manage.own on a worker this viewer invited. */
  canDismiss: boolean;
  /** Whether Dismiss applies at all. An inactive worker can't be dismissed, so
   * the item is omitted entirely (not just gated) — leaving Reassign only. */
  showDismiss: boolean;
  onReassign: () => void;
};

/**
 * The DW table's per-row `···` action cell: a Reassign + Dismiss menu (each
 * gated — greyed with a reason tooltip when the viewer lacks that permission)
 * plus the dismiss confirm dialog. The dismiss state + mutation live in
 * {@link useDismissAgent}, so this stays presentational.
 */
export function DwActionsCell({
  agent,
  canReassign,
  canDismiss,
  showDismiss,
  onReassign,
}: DwActionsCellProps): React.JSX.Element {
  const { t } = useLingui();
  const { confirmOpen, setConfirmOpen, onDismiss, isPending } =
    useDismissAgent(agent);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="subtle"
              size="icon-sm"
              aria-label={t({
                id: "team.dwActions.actions",
                message: "Digital Worker actions",
              })}
              className="text-foreground-secondary hover:text-foreground-primary shrink-0"
            />
          }
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        {/* Both items always show; each is gated (greyed + reason tooltip) for a
            viewer who lacks that specific permission. */}
        <DropdownMenuContent align="end" className="w-36!">
          <GatedMenuItem allowed={canReassign} onSelect={onReassign}>
            <UserRoundCog className="size-4" />
            {t({ id: "team.dwActions.reassign", message: "Reassign" })}
          </GatedMenuItem>
          {showDismiss ? (
            <GatedMenuItem
              allowed={canDismiss}
              variant="destructive"
              deniedTooltip={t({
                id: "team.dwActions.dismissDenied",
                message: "You can only dismiss workers you invited.",
              })}
              onSelect={() => setConfirmOpen(true)}
            >
              <Trash2 className="size-4" />
              {t({ id: "team.dwActions.dismiss", message: "Dismiss" })}
            </GatedMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t({
          id: "team.dwActions.dismissDialog.title",
          message: "Dismiss digital worker",
        })}
        body={t({
          id: "team.dwActions.dismissDialog.body",
          message: `Remove "${agent.name}" from this project. This can't be undone.`,
        })}
        onConfirm={onDismiss}
        pending={isPending}
        confirmLabel={t({
          id: "team.dwActions.dismissDialog.confirm",
          message: "Dismiss",
        })}
        pendingLabel={t({
          id: "team.dwActions.dismissDialog.pending",
          message: "Dismissing…",
        })}
      />
    </>
  );
}
