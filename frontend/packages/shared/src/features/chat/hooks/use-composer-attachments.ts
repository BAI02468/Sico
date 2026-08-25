import { useLingui } from "@lingui/react/macro";
import { toast } from "@sico/ui";
import { useAtom } from "jotai";

import { useAttachmentUploadLifecycle } from "../../../hooks/use-attachment-upload-lifecycle";
import { type CommonAttachment } from "../../../schemas/common-attachment";
import { logger } from "../../../utils/logger";
import { type Attachment, attachmentsAtom } from "../atoms/chat-atom";

type UploadFn = (file: File, signal: AbortSignal) => Promise<CommonAttachment>;

export type ComposerAttachments = {
  attachments: Attachment[];
  anyUploading: boolean;
  fileError: string | null;
  addFile: (file: File) => void;
  removeAttachment: (localId: string) => void;
  clear: () => void;
};

// Chat retains Jotai ownership while the cross-feature hook owns the shared
// upload state machine used by both attachment composers.
export function useComposerAttachments(upload: UploadFn): ComposerAttachments {
  const { t } = useLingui();
  const [attachments, setAttachments] = useAtom(attachmentsAtom);
  const lifecycle = useAttachmentUploadLifecycle({
    attachments,
    setAttachments,
    upload,
    fileTooLargeError: t({
      id: "chat.composer.fileTooLarge",
      message: "That file is over 16 MB. Pick a smaller one.",
    }),
    uploadFailedError: (file) =>
      t({
        id: "chat.composer.uploadFailed",
        message: `Couldn't upload "${file.name}". Try adding it again.`,
      }),
    onUploadFailure: (err, _file, message) => {
      logger.error("chat: attachment upload failed", { err });
      toast.error(message);
    },
  });

  return {
    attachments: lifecycle.attachments,
    anyUploading: lifecycle.anyUploading,
    fileError: lifecycle.fileError,
    addFile: lifecycle.addFile,
    removeAttachment: lifecycle.removeAttachment,
    clear: lifecycle.clear,
  };
}
