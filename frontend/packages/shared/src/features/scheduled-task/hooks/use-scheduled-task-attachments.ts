import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { toast } from "@sico/ui";
import { useEffect, useMemo, useState } from "react";

import { type AttachmentUploadItem } from "../../../components/attachment-input";
import { useAttachmentUploadLifecycle } from "../../../hooks/use-attachment-upload-lifecycle";
import { type CommonAttachment } from "../../../schemas/common-attachment";
import { useApiClient } from "../../../services/api-client-context";
import { uploadAttachment } from "../../../services/upload-attachment";
import { makeId } from "../../../utils/id";
import { logger } from "../../../utils/logger";

const FILE_TOO_LARGE_COPY = msg({
  id: "scheduledTask.attachments.fileTooLarge",
  message: "That file is over 16 MB. Pick a smaller one.",
});
const UPLOAD_FAILED_COPY = msg({
  id: "scheduledTask.attachments.uploadFailed",
  message: 'Couldn\'t upload "{fileName}". Try adding it again.',
});

type Options = {
  initialAttachments?: CommonAttachment[];
  onReadyAttachmentsChange?: (attachments: CommonAttachment[]) => void;
};

export type ScheduledTaskAttachments = {
  attachments: AttachmentUploadItem[];
  readyAttachments: CommonAttachment[];
  anyUploading: boolean;
  fileError: string | null;
  addFile: (file: File) => void;
  removeAttachment: (localId: string) => void;
  clear: () => void;
  reset: (attachments: CommonAttachment[]) => void;
};

function readyItems(attachments: CommonAttachment[]): AttachmentUploadItem[] {
  return attachments.map((assetRef) => ({
    localId: makeId(),
    status: "ready",
    assetRef,
  }));
}

function readyReferences(
  attachments: AttachmentUploadItem[],
): CommonAttachment[] {
  return attachments.flatMap((attachment) =>
    attachment.status === "ready" ? [attachment.assetRef] : [],
  );
}

function useReadyAttachmentCallback(
  callback: Options["onReadyAttachmentsChange"],
  attachments: CommonAttachment[],
): void {
  useEffect(() => callback?.(attachments), [callback, attachments]);
}

// Scheduled-task forms keep local ownership and server-reference callbacks;
// only the cross-feature upload state machine is shared with Chat.
export function useScheduledTaskAttachments(
  options: Options = {},
): ScheduledTaskAttachments {
  const { initialAttachments = [], onReadyAttachmentsChange } = options;
  const apiClient = useApiClient();
  const [attachments, setAttachments] = useState<AttachmentUploadItem[]>(() =>
    readyItems(initialAttachments),
  );
  const lifecycle = useAttachmentUploadLifecycle({
    attachments,
    setAttachments,
    upload: (file, signal) => uploadAttachment(apiClient, file, signal),
    fileTooLargeError: i18n._(FILE_TOO_LARGE_COPY),
    uploadFailedError: (file) =>
      i18n._(
        UPLOAD_FAILED_COPY.id,
        { fileName: file.name },
        UPLOAD_FAILED_COPY,
      ),
    onUploadFailure: (error, file, message) => {
      logger.error("scheduled task: attachment upload failed", {
        error,
        fileName: file.name,
      });
      toast.error(message);
    },
    abortOnUnmount: true,
  });
  const readyAttachments = useMemo(
    () => readyReferences(lifecycle.attachments),
    [lifecycle.attachments],
  );
  useReadyAttachmentCallback(onReadyAttachmentsChange, readyAttachments);
  const reset = (next: CommonAttachment[]): void => {
    lifecycle.resetAttachments(readyItems(next));
  };

  return {
    attachments: lifecycle.attachments,
    readyAttachments,
    anyUploading: lifecycle.anyUploading,
    fileError: lifecycle.fileError,
    addFile: lifecycle.addFile,
    removeAttachment: lifecycle.removeAttachment,
    clear: () => lifecycle.resetAttachments([]),
    reset,
  };
}
