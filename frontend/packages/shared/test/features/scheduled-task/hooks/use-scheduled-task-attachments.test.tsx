import { toast } from "@sico/ui";
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import axios from "axios";
import { createStore, Provider as JotaiProvider } from "jotai";
import type { ReactElement, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AttachmentChip } from "@/components/attachment-input";
import { type Attachment } from "@/features/chat/atoms/chat-atom";
import { attachmentsAtom } from "@/features/chat/atoms/chat-atom";
import { useScheduledTaskAttachments } from "@/features/scheduled-task/hooks/use-scheduled-task-attachments";
import { type CommonAttachment } from "@/schemas/common-attachment";
import { ApiClientProvider } from "@/services/api-client-context";
import { uploadAttachment } from "@/services/upload-attachment";
import { logger } from "@/utils/logger";

vi.mock("@/services/upload-attachment");
vi.mock("@sico/ui", async (importActual) => {
  const actual = await importActual<typeof import("@sico/ui")>();
  return { ...actual, toast: { error: vi.fn() } };
});

function attachment(name = "report.pdf"): CommonAttachment {
  return { name, size: 1, type: "application/pdf", uri: `asset://${name}` };
}

function file(name = "report.pdf", type = "application/pdf"): File {
  return new File(["x"], name, { type });
}

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
} {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: Error) => void = () => {};
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createWrapper(store = createStore()): {
  Wrapper: (props: { children: ReactNode }) => ReactElement;
  store: ReturnType<typeof createStore>;
} {
  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <JotaiProvider store={store}>
        <ApiClientProvider client={axios.create()}>
          {children}
        </ApiClientProvider>
      </JotaiProvider>
    );
  }

  return { Wrapper, store };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("useScheduledTaskAttachments", () => {
  it("initializes ready items from existing server attachments", () => {
    const existing = [attachment("existing.pdf")];
    const onReadyAttachmentsChange = vi.fn();
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useScheduledTaskAttachments({
          initialAttachments: existing,
          onReadyAttachmentsChange,
        }),
      { wrapper: Wrapper },
    );

    expect(result.current.attachments).toEqual([
      expect.objectContaining({ status: "ready", assetRef: existing[0] }),
    ]);
    expect(result.current.attachments[0]).not.toHaveProperty("file");
    expect(result.current.readyAttachments).toEqual(existing);
    expect(onReadyAttachmentsChange).toHaveBeenCalledWith(existing);
  });

  it("uploads a valid file and exposes its ready reference", async () => {
    const uploaded = attachment();
    vi.mocked(uploadAttachment).mockResolvedValueOnce(uploaded);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useScheduledTaskAttachments(), {
      wrapper: Wrapper,
    });

    act(() => result.current.addFile(file()));

    await waitFor(() =>
      expect(result.current.readyAttachments).toEqual([uploaded]),
    );
    expect(result.current.attachments[0]).toEqual(
      expect.objectContaining({ status: "ready", assetRef: uploaded }),
    );
  });

  it("preserves a local image preview after upload becomes ready", async () => {
    const image = file("preview.png", "image/png");
    const uploaded = attachment("preview.png");
    vi.mocked(uploadAttachment).mockResolvedValueOnce(uploaded);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useScheduledTaskAttachments(), {
      wrapper: Wrapper,
    });

    act(() => result.current.addFile(image));

    await waitFor(() => expect(result.current.anyUploading).toBe(false));
    const readyItem = result.current.attachments[0];
    expect(readyItem?.file).toBe(image);
    if (!readyItem) {
      throw new Error("Expected the uploaded attachment");
    }
    render(
      <AttachmentChip
        attachment={readyItem}
        onRemove={vi.fn()}
        allowRemotePreview={false}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByRole("img", { name: "preview.png" })).toHaveAttribute(
      "src",
      "blob:mock",
    );
  });

  it("uploads after StrictMode restarts its cleanup effect", async () => {
    const uploaded = attachment("strict.pdf");
    vi.mocked(uploadAttachment).mockResolvedValueOnce(uploaded);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useScheduledTaskAttachments(), {
      wrapper: Wrapper,
      reactStrictMode: true,
    });

    act(() => result.current.addFile(file("strict.pdf")));

    await waitFor(() =>
      expect(result.current.readyAttachments).toEqual([uploaded]),
    );
  });

  it("rejects a file larger than 16 MiB without starting an upload", () => {
    const oversized = new File([new Uint8Array(17 * 1024 * 1024)], "big.bin");
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useScheduledTaskAttachments(), {
      wrapper: Wrapper,
    });

    act(() => result.current.addFile(oversized));

    expect(result.current.fileError).toBe(
      "That file is over 16 MB. Pick a smaller one.",
    );
    expect(uploadAttachment).not.toHaveBeenCalled();
  });

  it("gives every upload a distinct abort signal", () => {
    const first = createDeferred<CommonAttachment>();
    const second = createDeferred<CommonAttachment>();
    vi.mocked(uploadAttachment)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useScheduledTaskAttachments(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.addFile(file("one.pdf"));
      result.current.addFile(file("two.pdf"));
    });

    const firstSignal = vi.mocked(uploadAttachment).mock.calls[0]?.[2];
    const secondSignal = vi.mocked(uploadAttachment).mock.calls[1]?.[2];
    expect(firstSignal).not.toBe(secondSignal);
    expect(firstSignal?.aborted).toBe(false);
    expect(secondSignal?.aborted).toBe(false);
  });

  it("aborts and stays silent when an uploading item is removed", async () => {
    vi.mocked(uploadAttachment).mockImplementationOnce(
      (_client, _file, signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useScheduledTaskAttachments(), {
      wrapper: Wrapper,
    });

    act(() => result.current.addFile(file()));
    const localId = result.current.attachments[0]?.localId ?? "";
    act(() => result.current.removeAttachment(localId));

    await waitFor(() => expect(result.current.attachments).toEqual([]));
    expect(vi.mocked(uploadAttachment).mock.calls[0]?.[2].aborted).toBe(true);
    expect(toast.error).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("clears in-flight uploads without reporting an abort", async () => {
    vi.mocked(uploadAttachment).mockImplementationOnce(
      (_client, _file, signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useScheduledTaskAttachments(), {
      wrapper: Wrapper,
    });

    act(() => result.current.addFile(file()));
    const signal = vi.mocked(uploadAttachment).mock.calls[0]?.[2];
    act(() => result.current.clear());

    await waitFor(() => expect(result.current.attachments).toEqual([]));
    expect(signal?.aborted).toBe(true);
    expect(toast.error).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("removes an existing ready attachment", () => {
    const existing = attachment();
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useScheduledTaskAttachments({ initialAttachments: [existing] }),
      { wrapper: Wrapper },
    );
    const localId = result.current.attachments[0]?.localId ?? "";

    act(() => result.current.removeAttachment(localId));

    expect(result.current.readyAttachments).toEqual([]);
  });

  it("removes only a failed item and reports the genuine upload failure", async () => {
    const successful = createDeferred<CommonAttachment>();
    vi.mocked(uploadAttachment)
      .mockReturnValueOnce(successful.promise)
      .mockRejectedValueOnce(new Error("upload failed"));
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useScheduledTaskAttachments(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.addFile(file("keep.pdf"));
      result.current.addFile(file("drop.pdf"));
    });
    act(() => successful.resolve(attachment("keep.pdf")));

    await waitFor(() =>
      expect(result.current.readyAttachments).toEqual([attachment("keep.pdf")]),
    );
    expect(result.current.attachments).toHaveLength(1);
    expect(toast.error).toHaveBeenCalledWith(
      'Couldn\'t upload "drop.pdf". Try adding it again.',
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "scheduled task: attachment upload failed",
      {
        error: expect.any(Error),
        fileName: "drop.pdf",
      },
    );
    errorSpy.mockRestore();
  });

  it("aborts every in-flight upload when unmounted", () => {
    const pending = createDeferred<CommonAttachment>();
    vi.mocked(uploadAttachment).mockReturnValueOnce(pending.promise);
    const { Wrapper } = createWrapper();
    const { result, unmount } = renderHook(
      () => useScheduledTaskAttachments(),
      {
        wrapper: Wrapper,
      },
    );

    act(() => result.current.addFile(file()));
    const signal = vi.mocked(uploadAttachment).mock.calls[0]?.[2];
    unmount();

    expect(signal?.aborted).toBe(true);
  });

  it("does not reconcile an upload that resolves after unmount", async () => {
    const pending = createDeferred<CommonAttachment>();
    const onReadyAttachmentsChange = vi.fn();
    vi.mocked(uploadAttachment).mockReturnValueOnce(pending.promise);
    const { Wrapper } = createWrapper();
    const { result, unmount } = renderHook(
      () => useScheduledTaskAttachments({ onReadyAttachmentsChange }),
      { wrapper: Wrapper },
    );

    act(() => result.current.addFile(file()));
    onReadyAttachmentsChange.mockClear();
    const signal = vi.mocked(uploadAttachment).mock.calls[0]?.[2];
    unmount();
    await act(async () => pending.resolve(attachment()));

    expect(signal?.aborted).toBe(true);
    expect(onReadyAttachmentsChange).not.toHaveBeenCalled();
  });

  it("does not report an upload rejected after unmount", async () => {
    const pending = createDeferred<CommonAttachment>();
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    vi.mocked(uploadAttachment).mockReturnValueOnce(pending.promise);
    const { Wrapper } = createWrapper();
    const { result, unmount } = renderHook(
      () => useScheduledTaskAttachments(),
      {
        wrapper: Wrapper,
      },
    );

    act(() => result.current.addFile(file()));
    const signal = vi.mocked(uploadAttachment).mock.calls[0]?.[2];
    unmount();
    await act(async () => pending.reject(new Error("late failure")));

    expect(signal?.aborted).toBe(true);
    expect(toast.error).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("keeps anyUploading true until every active upload settles", async () => {
    const first = createDeferred<CommonAttachment>();
    const second = createDeferred<CommonAttachment>();
    vi.mocked(uploadAttachment)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useScheduledTaskAttachments(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.addFile(file("one.pdf"));
      result.current.addFile(file("two.pdf"));
    });
    act(() => first.resolve(attachment("one.pdf")));

    await waitFor(() =>
      expect(result.current.readyAttachments).toEqual([attachment("one.pdf")]),
    );
    expect(result.current.anyUploading).toBe(true);
    act(() => second.resolve(attachment("two.pdf")));

    await waitFor(() => expect(result.current.anyUploading).toBe(false));
  });

  it("resets local state and reports the replacement ready references", () => {
    const initial = attachment("initial.pdf");
    const replacement = attachment("replacement.pdf");
    const onReadyAttachmentsChange = vi.fn();
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useScheduledTaskAttachments({
          initialAttachments: [initial],
          onReadyAttachmentsChange,
        }),
      { wrapper: Wrapper },
    );

    act(() => result.current.reset([replacement]));

    expect(result.current.readyAttachments).toEqual([replacement]);
    expect(onReadyAttachmentsChange).toHaveBeenLastCalledWith([replacement]);
  });

  it("never mutates the chat attachments atom", async () => {
    const chatAttachment: Attachment = {
      localId: "chat-attachment",
      status: "ready",
      assetRef: attachment("chat.pdf"),
    };
    const store = createStore();
    store.set(attachmentsAtom, [chatAttachment]);
    const before = store.get(attachmentsAtom);
    vi.mocked(uploadAttachment).mockResolvedValueOnce(attachment("task.pdf"));
    const { Wrapper } = createWrapper(store);
    const { result } = renderHook(() => useScheduledTaskAttachments(), {
      wrapper: Wrapper,
    });

    act(() => result.current.addFile(file("task.pdf")));
    await waitFor(() =>
      expect(result.current.readyAttachments).toEqual([attachment("task.pdf")]),
    );
    act(() =>
      result.current.removeAttachment(
        result.current.attachments[0]?.localId ?? "",
      ),
    );

    expect(store.get(attachmentsAtom)).toBe(before);
    expect(store.get(attachmentsAtom)).toStrictEqual([chatAttachment]);
  });
});
