import { type JSX } from "react";

import { AttachmentChip } from "./attachment-chip";
import { type AttachmentUploadItem } from "./types";

type Props = {
  attachments: AttachmentUploadItem[];
  onRemove: (localId: string) => void;
  disabled?: boolean;
  allowRemotePreview?: boolean;
};

export function AttachmentBar({
  attachments,
  onRemove,
  disabled = false,
  allowRemotePreview = true,
}: Props): JSX.Element | null {
  if (attachments.length === 0) {
    return null;
  }
  return (
    <div className="mb-3 flex w-full flex-wrap items-center gap-2 px-4">
      {attachments.map((attachment) => (
        <AttachmentChip
          key={attachment.localId}
          attachment={attachment}
          onRemove={onRemove}
          disabled={disabled}
          allowRemotePreview={allowRemotePreview}
        />
      ))}
    </div>
  );
}
