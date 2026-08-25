import { useLingui } from "@lingui/react/macro";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  toast,
} from "@sico/ui";
import { useNavigate } from "@tanstack/react-router";
import { Download, Ellipsis, Trash2 } from "lucide-react";
import { type JSX } from "react";

import { AssetContentCard } from "./asset-content-card";
import { AssetDetailLayout } from "./asset-detail-layout";
import { AssetDetailMetaPanel } from "./asset-detail-meta-panel";
import { DELETE_DENIED_TOOLTIP, GatedMenuItem } from "./gated-menu-item";
import { MessageState } from "../../../components/message-state";
import { EMPTY_ILLUSTRATIONS } from "../../../constants/empty-illustration";
import { downloadFile } from "../../../utils/download-file";
import { FilePreview } from "../../file-preview/components/file-preview";
import { useAssetDeleteGate } from "../hooks/use-asset-delete-gate";
import type { AssetDetail as AssetDetailData } from "../hooks/use-asset-detail-query";
import { useAssetMutation } from "../hooks/use-asset-mutation";

type DeliverableDetail = Extract<AssetDetailData, { type: "deliverable" }>;

export type AssetDetailDeliverableProps = {
  asset: DeliverableDetail;
  /** Owning project — the back-fallback target when there's no history. */
  projectId: number;
};

// The deliverable `…` overflow menu — Download (when the file exists) + Delete,
// in the shell's `actions` slot. Delete stays visible but is gated (greyed +
// reason tooltip) when the viewer isn't an admin and didn't create the asset. A
// plain module-scope render helper (NOT a nested component) so the component
// body stays under the line cap.
function renderActions(
  copy: {
    download: string;
    delete: string;
    actionsAriaLabel: string;
  },
  onRequestDelete: () => void,
  canDelete: boolean,
  onDownload?: () => void,
): JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="subtle"
            size="icon-sm"
            aria-label={copy.actionsAriaLabel}
          />
        }
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onDownload ? (
          <DropdownMenuItem onClick={onDownload}>
            <Download />
            {copy.download}
          </DropdownMenuItem>
        ) : null}
        <GatedMenuItem
          allowed={canDelete}
          variant="destructive"
          deniedTooltip={DELETE_DENIED_TOOLTIP}
          onSelect={onRequestDelete}
        >
          <Trash2 />
          {copy.delete}
        </GatedMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Delete the deliverable, then toast + navigate back to the project on success
// (keep the user on the page on failure so they can retry). Module-scope (no
// hooks) so the component body stays under the line cap — mirrors
// `runDelete` in use-asset-row-actions.
function runDeliverableDelete({
  formatDeletedSuccess,
  deleteError,
  remove,
  args,
  navigate,
}: {
  formatDeletedSuccess: (filename: string) => string;
  deleteError: string;
  remove: ReturnType<typeof useAssetMutation>["remove"];
  args: { assetId: number; projectId: number; filename: string };
  navigate: ReturnType<typeof useNavigate>;
}): void {
  remove.mutate(
    { id: args.assetId, type: "deliverable" },
    {
      onSuccess: () => {
        toast.success(formatDeletedSuccess(args.filename), { invert: true });
        void navigate({
          to: "/project/$projectId",
          params: { projectId: String(args.projectId) },
        });
      },
      onError: () => {
        toast.error(deleteError);
      },
    },
  );
}

// The file card — FilePreview renders FULL-WIDTH (a PDF/image/video preview
// doesn't suit the markdown reading gutter), or an explicit unavailable state
// when there's no SAS url. Module-scope (no hooks) so the body stays short.
function renderDeliverableFile(
  copy: {
    unavailableHeading: string;
    unavailableBody: string;
  },
  filename: string,
  fileSasUrl: string | null | undefined,
): JSX.Element {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 pt-0 pb-4">
      <AssetContentCard>
        {fileSasUrl ? (
          <FilePreview fileUrl={fileSasUrl} filename={filename} />
        ) : (
          <MessageState
            fill
            testId="deliverable-unavailable"
            illustrationUrl={EMPTY_ILLUSTRATIONS.noPreview.url}
            illustrationWidth={EMPTY_ILLUSTRATIONS.noPreview.width}
            illustrationHeight={EMPTY_ILLUSTRATIONS.noPreview.height}
            heading={copy.unavailableHeading}
            body={copy.unavailableBody}
          />
        )}
      </AssetContentCard>
    </div>
  );
}

/**
 * Full-page deliverable preview — the published file a Digital Worker produced,
 * opened from the project's Deliverable tab. Renders the shared `FilePreview`
 * on the left and the simple Detail panel (whose `…` menu carries Download +
 * Delete) on the right, inside the shared {@link AssetDetailLayout}. The route
 * hands it an already-resolved id; the query suspends.
 */
export function AssetDetailDeliverable({
  asset,
  projectId,
}: AssetDetailDeliverableProps): JSX.Element {
  const { t } = useLingui();
  const navigate = useNavigate();
  const { remove } = useAssetMutation(projectId);
  const canDelete = useAssetDeleteGate(asset, projectId);
  const fileSasUrl = asset.fileSasUrl;
  const filename = asset.fileName;

  const copy = {
    download: t({
      id: "projects.assetDeliverable.download",
      message: "Download",
    }),
    delete: t({ id: "projects.assetDeliverable.delete", message: "Delete" }),
    unavailableHeading: t({
      id: "projects.assetDeliverable.unavailableHeading",
      message: "This file isn't available.",
    }),
    unavailableBody: t({
      id: "projects.assetDeliverable.unavailableBody",
      message: "The deliverable has no file to preview or download.",
    }),
    actionsAriaLabel: t({
      id: "projects.assetDeliverable.actionsAriaLabel",
      message: "Asset actions",
    }),
    deleteTitle: t({
      id: "projects.assetDeliverable.deleteTitle",
      message: "Delete Deliverable",
    }),
    deleteBody: t({
      id: "projects.assetDeliverable.deleteBody",
      message: "Permanently remove this deliverable across your project.",
    }),
    deleteError: t({
      id: "projects.assetDeliverable.deleteError",
      message: "We couldn't delete this. Try again.",
    }),
    formatDeletedSuccess: (name: string): string =>
      t({
        id: "projects.assetDeliverable.deletedSuccess",
        message: `"${name}" was deleted.`,
      }),
  } as const;

  const handleDownload = fileSasUrl
    ? (): void => {
        void downloadFile(fileSasUrl, filename);
      }
    : undefined;

  return (
    <AssetDetailLayout
      projectId={projectId}
      current={filename}
      leftBody={renderDeliverableFile(copy, filename, fileSasUrl)}
      rightPanel={
        <AssetDetailMetaPanel
          fileName={asset.fileName}
          createdAt={asset.createdAt}
          dwName={asset.extraInfo?.agentInstance?.agentName}
          operator={asset.creatorUsername ?? undefined}
        />
      }
      actions={(onRequestDelete) =>
        renderActions(copy, onRequestDelete, canDelete, handleDownload)
      }
      confirm={{
        title: copy.deleteTitle,
        body: copy.deleteBody,
        onConfirm: () =>
          runDeliverableDelete({
            formatDeletedSuccess: copy.formatDeletedSuccess,
            deleteError: copy.deleteError,
            remove,
            args: { assetId: asset.id, projectId, filename },
            navigate,
          }),
        pending: remove.isPending,
      }}
    />
  );
}
