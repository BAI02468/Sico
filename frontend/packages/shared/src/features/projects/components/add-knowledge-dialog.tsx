import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  toast,
} from "@sico/ui";
import { useRef, useState } from "react";
import type * as React from "react";

import {
  type AttachmentView,
  type DialogCopy,
  renderAttachments,
  renderDropZone,
  renderFooter,
  renderLinkRow,
  renderTagArea,
  reportResult,
} from "./add-knowledge-dialog-parts";
import { safeIconUri } from "../../../utils/safe-icon-uri";
import { useAddKnowledgeMutation } from "../hooks/use-add-knowledge-mutation";
import { collectValidFiles, fileKey } from "../utils/collect-valid-files";

// Args for buildAttachments — bundled into one object so the helper stays under
// the 4-param cap.
type BuildAttachmentsArgs = {
  files: File[];
  links: string[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setLinks: React.Dispatch<React.SetStateAction<string[]>>;
};

// Module-scope `msg()` descriptors (statically extractable). Resolved via
// `i18n._` at render time; the dialog subscribes with `useLingui`, so a locale
// switch re-renders it and every string re-resolves in the new locale.
const TOO_MANY_FILES_COPY = msg({
  id: "projects.addKnowledge.error.tooManyFiles",
  message: "You can add up to 5 files.",
});
const UNSUPPORTED_TYPE_COPY = msg({
  id: "projects.addKnowledge.error.unsupportedType",
  message: '"{0}" has an unsupported file type.',
});
const FILE_TOO_LARGE_COPY = msg({
  id: "projects.addKnowledge.error.fileTooLarge",
  message: '"{0}" exceeds the 10MB size limit.',
});
const INVALID_LINK_COPY = msg({
  id: "projects.addKnowledge.toast.invalidLink",
  message: "Enter a valid http(s) link.",
});
const TITLE_COPY = msg({
  id: "projects.addKnowledge.title",
  message: "Add Knowledge",
});
const UPLOAD_LABEL_COPY = msg({
  id: "projects.addKnowledge.uploadLabel",
  message: "Upload context",
});
const UPLOAD_HINT1_COPY = msg({
  id: "projects.addKnowledge.uploadHint1",
  message: "Supports pdf, docx, xlsx · up to 10MB · max 5 files",
});
const UPLOAD_HINT2_COPY = msg({
  id: "projects.addKnowledge.uploadHint2",
  message: "Files must be publicly accessible.",
});
const ADD_FILES_COPY = msg({
  id: "projects.addKnowledge.action.addFiles",
  message: "Add files",
});
const ADD_COPY = msg({ id: "common.action.add", message: "Add" });
const IMPORT_LABEL_COPY = msg({
  id: "projects.addKnowledge.action.import",
  message: "Import from link",
});
const IMPORT_PLACEHOLDER_COPY = msg({
  id: "projects.addKnowledge.importPlaceholder",
  message: "Paste a link to import",
});
const CANCEL_COPY = msg({ id: "common.action.cancel", message: "Cancel" });
const UPLOAD_COPY = msg({ id: "common.action.upload", message: "Upload" });
const UPLOADING_COPY = msg({
  id: "common.status.uploading",
  message: "Uploading…",
});
const FAILED_COPY = msg({
  id: "projects.addKnowledge.toast.failed",
  message: "Some items couldn't be added. Try again.",
});
const SUCCESS_COPY = msg({
  id: "projects.addKnowledge.toast.success",
  message: "Knowledge uploaded — extracting…",
});
const REMOVE_FILE_COPY = msg({
  id: "projects.addKnowledge.action.removeFile",
  message: "Remove {name}",
});
const REMOVE_LINK_COPY = msg({
  id: "projects.addKnowledge.action.removeLink",
  message: "Remove {url}",
});

export type AddKnowledgeDialogProps = {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function createDialogCopy(): DialogCopy {
  return {
    title: i18n._(TITLE_COPY),
    uploadLabel: i18n._(UPLOAD_LABEL_COPY),
    uploadHint1: i18n._(UPLOAD_HINT1_COPY),
    uploadHint2: i18n._(UPLOAD_HINT2_COPY),
    addFiles: i18n._(ADD_FILES_COPY),
    add: i18n._(ADD_COPY),
    importLabel: i18n._(IMPORT_LABEL_COPY),
    importPlaceholder: i18n._(IMPORT_PLACEHOLDER_COPY),
    cancel: i18n._(CANCEL_COPY),
    upload: i18n._(UPLOAD_COPY),
    uploading: i18n._(UPLOADING_COPY),
    failed: i18n._(FAILED_COPY),
    success: i18n._(SUCCESS_COPY),
  };
}

function toastFileRejection(rejection: {
  reason: "tooMany" | "unsupportedType" | "tooLarge";
  filename?: string;
}): void {
  if (rejection.reason === "tooMany") {
    toast.error(i18n._(TOO_MANY_FILES_COPY));
    return;
  }
  const name = rejection.filename ?? "File";
  if (rejection.reason === "unsupportedType") {
    toast.error(
      i18n._(UNSUPPORTED_TYPE_COPY.id, { 0: name }, UNSUPPORTED_TYPE_COPY),
    );
    return;
  }
  toast.error(i18n._(FILE_TOO_LARGE_COPY.id, { 0: name }, FILE_TOO_LARGE_COPY));
}

function buildAttachments({
  files,
  links,
  setFiles,
  setLinks,
}: BuildAttachmentsArgs): AttachmentView[] {
  return [
    ...files.map((file, index) => ({
      key: fileKey(file),
      filename: file.name,
      removeLabel: i18n._(
        REMOVE_FILE_COPY.id,
        { name: file.name },
        REMOVE_FILE_COPY,
      ),
      onRemove: () => setFiles((prev) => prev.filter((_, i) => i !== index)),
    })),
    ...links.map((url, index) => ({
      key: url,
      filename: url,
      removeLabel: i18n._(REMOVE_LINK_COPY.id, { url }, REMOVE_LINK_COPY),
      onRemove: () => setLinks((prev) => prev.filter((_, i) => i !== index)),
    })),
  ];
}

export function AddKnowledgeDialog({
  projectId,
  open,
  onOpenChange,
}: AddKnowledgeDialogProps): React.JSX.Element {
  const [files, setFiles] = useState<File[]>([]);
  const [links, setLinks] = useState<string[]>([]);
  const [linkDraft, setLinkDraft] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Subscribe so a locale switch re-renders the dialog and the `i18n._`-resolved
  // copy below (title, dropzone, footer, attachment labels) re-resolves.
  useLingui();
  const mutation = useAddKnowledgeMutation(projectId);
  const copy = createDialogCopy();

  const resetAndClose = (): void => {
    setFiles([]);
    setLinks([]);
    setLinkDraft("");
    setSelectedTagIds([]);
    onOpenChange(false);
  };

  const addFiles = (incoming: File[]): void => {
    const { accepted, rejections } = collectValidFiles(incoming, files);
    for (const rejection of rejections) {
      toastFileRejection(rejection);
    }
    if (accepted.length > 0) {
      setFiles((prev) => [...prev, ...accepted]);
    }
  };

  const addLink = (): void => {
    const url = linkDraft.trim();
    if (!url || links.includes(url)) {
      return;
    }
    if (!safeIconUri(url)) {
      toast.error(i18n._(INVALID_LINK_COPY));
      return;
    }
    setLinks((prev) => [...prev, url]);
    setLinkDraft("");
  };

  const attachments = buildAttachments({
    files,
    links,
    setFiles,
    setLinks,
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : resetAndClose())}
    >
      <DialogContent variant="content" className="w-150">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6">
          {renderTagArea(projectId, selectedTagIds, setSelectedTagIds)}
          {renderDropZone(
            fileInputRef,
            (event) => {
              const input = event.target;
              addFiles(Array.from(input.files ?? []));
              input.value = "";
            },
            addFiles,
            copy,
          )}
          {renderLinkRow(linkDraft, setLinkDraft, addLink, copy)}
          {renderAttachments(attachments)}
        </div>
        {renderFooter(
          files.length + links.length,
          mutation.isPending,
          {
            onCancel: resetAndClose,
            onUpload: () => {
              if (files.length === 0 && links.length === 0) {
                return;
              }
              mutation.mutate(
                { files, links, tagIds: selectedTagIds },
                {
                  onSuccess: (result) =>
                    reportResult(result, resetAndClose, {
                      failed: copy.failed,
                      success: copy.success,
                    }),
                },
              );
            },
          },
          copy,
        )}
      </DialogContent>
    </Dialog>
  );
}
