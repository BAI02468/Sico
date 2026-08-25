import { act, renderHook, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { type AttachmentUploadItem } from "@/components/attachment-input";
import { MAX_ATTACHMENT_BYTES } from "@/constants/attachment";
import { useAttachmentUploadLifecycle } from "@/hooks/use-attachment-upload-lifecycle";
import { type CommonAttachment } from "@/schemas/common-attachment";

function attachment(name = "report.pdf"): CommonAttachment {
  return { name, size: 1, type: "application/pdf", uri: `asset://${name}` };
}

function useHarness(
  upload: (file: File, signal: AbortSignal) => Promise<CommonAttachment>,
  onUploadFailure = vi.fn(),
): ReturnType<typeof useAttachmentUploadLifecycle> {
  const [attachments, setAttachments] = useState<AttachmentUploadItem[]>([]);
  return useAttachmentUploadLifecycle({
    attachments,
    setAttachments,
    upload,
    fileTooLargeError: "too large",
    uploadFailedError: (file) => `failed: ${file.name}`,
    onUploadFailure,
  });
}

describe("useAttachmentUploadLifecycle", () => {
  it("preserves the local file when an upload becomes ready", async () => {
    const image = new File(["x"], "preview.png", { type: "image/png" });
    const uploaded = attachment("preview.png");
    const upload = vi.fn().mockResolvedValue(uploaded);
    const { result } = renderHook(() => useHarness(upload));

    act(() => result.current.addFile(image));

    await waitFor(() => expect(result.current.anyUploading).toBe(false));
    expect(result.current.attachments[0]).toEqual({
      localId: expect.any(String),
      file: image,
      status: "ready",
      assetRef: uploaded,
    });
  });

  it("rejects files over the shared size limit", () => {
    const upload = vi.fn();
    const oversized = new File(
      [new Uint8Array(MAX_ATTACHMENT_BYTES + 1)],
      "big.bin",
    );
    const { result } = renderHook(() => useHarness(upload));

    act(() => result.current.addFile(oversized));

    expect(result.current.fileError).toBe("too large");
    expect(upload).not.toHaveBeenCalled();
  });

  it("removes a failed upload and reports its resolved failure", async () => {
    const error = new Error("upload failed");
    const upload = vi.fn().mockRejectedValue(error);
    const onUploadFailure = vi.fn();
    const { result } = renderHook(() => useHarness(upload, onUploadFailure));
    const file = new File(["x"], "failed.pdf");

    act(() => result.current.addFile(file));

    await waitFor(() => expect(result.current.attachments).toEqual([]));
    expect(onUploadFailure).toHaveBeenCalledWith(
      error,
      file,
      "failed: failed.pdf",
    );
  });

  it("aborts a removed upload without reporting a failure", async () => {
    const upload = vi.fn(
      (_file: File, signal: AbortSignal) =>
        new Promise<CommonAttachment>((_resolve, reject) => {
          signal.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    const onUploadFailure = vi.fn();
    const { result } = renderHook(() => useHarness(upload, onUploadFailure));

    act(() => result.current.addFile(new File(["x"], "remove.pdf")));
    const localId = result.current.attachments[0]?.localId ?? "";
    act(() => result.current.removeAttachment(localId));

    await waitFor(() => expect(result.current.attachments).toEqual([]));
    expect(vi.mocked(upload).mock.calls[0]?.[1].aborted).toBe(true);
    expect(onUploadFailure).not.toHaveBeenCalled();
  });
});
