import { Button, DialogFooter, FieldLabel, Input, toast } from "@sico/ui";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import type * as React from "react";
import { ErrorBoundary } from "react-error-boundary";

import { AddKnowledgeTagArea } from "./add-knowledge-tag-area";
import { AddKnowledgeTagAreaSkeleton } from "./add-knowledge-tag-area-skeleton";
import { FileTile } from "../../../components/file-tile";
import { logger } from "../../../utils/logger";
import { type AddKnowledgeResult } from "../hooks/use-add-knowledge-mutation";

// Copy resolved once at the React boundary (方案 C) and threaded into these pure
// render helpers as plain strings — the helpers never receive the translator,
// so they stay trivially testable and framework-agnostic.
export type DialogCopy = {
  title: string;
  uploadLabel: string;
  uploadHint1: string;
  uploadHint2: string;
  addFiles: string;
  add: string;
  importLabel: string;
  importPlaceholder: string;
  cancel: string;
  upload: string;
  uploading: string;
  failed: string;
  success: string;
};

// A file/link chip: identity key, display name, its already-translated remove
// label, and the removal handler — all resolved at the boundary.
export type AttachmentView = {
  key: string;
  filename: string;
  removeLabel: string;
  onRemove: () => void;
};

// Render helpers — plain module-scope functions (NOT nested components, so
// `react/no-unstable-nested-components` never fires) that keep the dialog body
// under the 100-line cap. Called as `{renderDropZone(...)}`, never
// `<RenderDropZone/>` — the exact pattern `edit-project-dialog.tsx` uses.

// The knowledge-tag picker. It suspends on `useKnowledgeTagsQuery`, so a LOCAL
// ErrorBoundary drops only the tag area on failure (a secondary field) instead
// of escalating to the page boundary and blanking the whole workspace.
export function renderTagArea(
  projectId: number,
  value: number[],
  onChange: (next: number[]) => void,
): React.JSX.Element {
  return (
    <ErrorBoundary
      fallback={null}
      onError={(error) => logger.error("tag area failed", { error })}
    >
      <Suspense fallback={<AddKnowledgeTagAreaSkeleton />}>
        <AddKnowledgeTagArea
          projectId={projectId}
          value={value}
          onChange={onChange}
        />
      </Suspense>
    </ErrorBoundary>
  );
}

export function renderDropZone(
  fileInputRef: React.RefObject<HTMLInputElement | null>,
  onFileInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void,
  onDropFiles: (files: File[]) => void,
  copy: DialogCopy,
): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <FieldLabel className="text-base">{copy.uploadLabel}</FieldLabel>
      <div
        className="border-input-stroke-rest bg-surface-basic flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-9"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onDropFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <p className="text-foreground-secondary leading-body text-center text-sm">
          {copy.uploadHint1}
        </p>
        <p className="text-foreground-secondary leading-body text-center text-sm">
          {copy.uploadHint2}
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
        >
          {copy.addFiles}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.xlsx"
          className="hidden"
          data-testid="add-knowledge-file-input"
          onChange={onFileInputChange}
        />
      </div>
    </div>
  );
}

export function renderLinkRow(
  linkDraft: string,
  onLinkDraftChange: (value: string) => void,
  onAddLink: () => void,
  copy: DialogCopy,
): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <Input
        aria-label={copy.importLabel}
        placeholder={copy.importPlaceholder}
        value={linkDraft}
        onChange={(event) => onLinkDraftChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onAddLink();
          }
        }}
      />
      <Button type="button" variant="secondary" onClick={onAddLink}>
        {copy.add}
      </Button>
    </div>
  );
}

function renderAttachmentRow(attachment: AttachmentView): React.JSX.Element {
  // The glyph is derived from `filename` inside <FileTile> via
  // `iconForFilename` — files resolve by extension, a link (an http(s) URL)
  // resolves to the globe.
  return (
    <FileTile
      key={attachment.key}
      filename={attachment.filename}
      removeLabel={attachment.removeLabel}
      onRemove={attachment.onRemove}
    />
  );
}

// Mixed-result toast (M-3): a partial failure still surfaces, and any success
// closes the dialog. Closing on success only is intentional — a full failure
// keeps the dialog so the user can retry. The success copy says "extracting"
// (not "added") because registration only queues extraction — the extraction
// result toast fires later, from the table's poll (useExtractionResultToast).
export function reportResult(
  result: AddKnowledgeResult,
  onClose: () => void,
  copy: Pick<DialogCopy, "failed" | "success">,
): void {
  if (result.failed.length > 0) {
    toast.error(copy.failed);
  }
  if (result.succeeded.length > 0) {
    toast.success(copy.success);
    onClose();
  }
}

// Footer (§5): Cancel + Upload. `Upload` is enabled once there's at least one
// file OR one link (migration C3); links and files both flow into submit.
export function renderFooter(
  itemCount: number,
  isPending: boolean,
  handlers: { onCancel: () => void; onUpload: () => void },
  copy: DialogCopy,
): React.JSX.Element {
  return (
    <DialogFooter>
      <Button type="button" variant="secondary" onClick={handlers.onCancel}>
        {copy.cancel}
      </Button>
      <Button
        type="button"
        variant="primary"
        aria-busy={isPending}
        aria-label={isPending ? copy.uploading : undefined}
        disabled={itemCount === 0 || isPending}
        onClick={handlers.onUpload}
      >
        {isPending ? <Loader2 className="animate-spin" /> : copy.upload}
      </Button>
    </DialogFooter>
  );
}

export function renderAttachments(
  attachments: AttachmentView[],
): React.JSX.Element | null {
  if (attachments.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((attachment) => renderAttachmentRow(attachment))}
    </div>
  );
}
