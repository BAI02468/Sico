import { useLingui } from "@lingui/react/macro";
import { type JSX, useLayoutEffect, useState } from "react";

import { isImageFilename } from "../../utils/file-type";
import { safeIconUri } from "../../utils/safe-icon-uri";
import { FileTile } from "../file-tile";
import { ImageTile } from "../image-tile";
import { type AttachmentUploadItem } from "./types";

type Props = {
  attachment: AttachmentUploadItem;
  onRemove: (localId: string) => void;
  disabled?: boolean;
  allowRemotePreview?: boolean;
};

export function AttachmentChip({
  attachment,
  onRemove,
  disabled = false,
  allowRemotePreview = true,
}: Props): JSX.Element {
  const { t } = useLingui();
  const { localId, file, status } = attachment;
  const assetRef = status === "ready" ? attachment.assetRef : undefined;
  const filename = file?.name ?? assetRef?.name ?? "";
  const isImage = isImageFilename(filename);

  // The object URL belongs to the layout effect rather than render, so every
  // committed allocation has one cleanup. Layout effects run before paint: local
  // previews appear without a visible placeholder, while StrictMode can safely
  // set up, clean up, and re-mint a live URL.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useLayoutEffect(() => {
    if (!file || !isImage) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear a prior local preview before a server attachment or file-kind change paints
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronize the effect-owned URL before paint
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  const remotePreviewUrl =
    !file && allowRemotePreview ? safeIconUri(assetRef?.sasUrl) : undefined;
  const imageSrc = previewUrl ?? remotePreviewUrl;
  const tileStatus = status === "uploading" ? "loading" : "ready";
  const removeLabel = t({
    id: "chat.attachmentChip.removeAttachment",
    message: "Remove attachment",
  });
  const handleRemove = (): void => onRemove(localId);

  if (isImage && imageSrc) {
    return (
      <ImageTile
        src={imageSrc}
        alt={filename}
        status={tileStatus}
        removeLabel={removeLabel}
        onRemove={handleRemove}
        disabled={disabled}
      />
    );
  }

  return (
    <FileTile
      filename={filename}
      status={tileStatus}
      removeLabel={removeLabel}
      onRemove={handleRemove}
      disabled={disabled}
    />
  );
}
