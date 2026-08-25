import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AttachmentChip,
  type AttachmentUploadItem,
} from "@/components/attachment-input";
import { type CommonAttachment } from "@/schemas/common-attachment";

// One test overrides the unique-blob mock; restore the shared "blob:mock"
// stub so the static-markup tests that assert src="blob:mock" stay green.
afterEach(() => {
  vi.mocked(URL.createObjectURL).mockReturnValue("blob:mock");
  vi.mocked(URL.revokeObjectURL).mockReset();
});

function attachmentRef(file: File): CommonAttachment {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    uri: "asset://1",
  };
}

function fileAttachment(
  over: {
    file?: File;
    status?: "ready" | "uploading";
  } = {},
): AttachmentUploadItem {
  const file =
    over.file ?? new File(["x"], "report.pdf", { type: "application/pdf" });

  if (over.status === "uploading") {
    return {
      localId: "a1",
      file,
      status: "uploading",
      abortHandle: new AbortController(),
    };
  }

  return {
    localId: "a1",
    file,
    status: "ready",
    assetRef: attachmentRef(file),
  };
}

function serverAttachment(
  over: {
    name?: string;
    sasUrl?: string;
  } = {},
): AttachmentUploadItem {
  const name = over.name ?? "pic.png";
  return {
    localId: "server-1",
    status: "ready",
    assetRef: {
      name,
      size: 1,
      type: "image/png",
      uri: "asset://server-1",
      sasUrl: over.sasUrl,
    },
  };
}

describe("AttachmentChip", () => {
  it("shows the filename for a ready file chip", () => {
    render(<AttachmentChip attachment={fileAttachment()} onRemove={vi.fn()} />);
    expect(screen.getByText("report.pdf")).toBeInTheDocument();
  });

  it("shows a spinner while uploading", () => {
    render(
      <AttachmentChip
        attachment={fileAttachment({ status: "uploading" })}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByTestId("file-tile-loading")).toBeInTheDocument();
  });

  it("fires onRemove with the localId when × is clicked", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <AttachmentChip attachment={fileAttachment()} onRemove={onRemove} />,
    );
    await user.click(screen.getByRole("button", { name: "Remove attachment" }));
    expect(onRemove).toHaveBeenCalledWith("a1");
  });

  it("disables the remove control when disabled", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <AttachmentChip
        attachment={fileAttachment()}
        onRemove={onRemove}
        disabled
      />,
    );
    const remove = screen.getByRole("button", { name: "Remove attachment" });

    expect(remove).toBeDisabled();
    await user.click(remove);

    expect(onRemove).not.toHaveBeenCalled();
  });

  it("overlays the remove button on an image chip", () => {
    render(
      <AttachmentChip
        attachment={fileAttachment({
          file: new File(["x"], "pic.png", { type: "image/png" }),
        })}
        onRemove={vi.fn()}
      />,
    );
    const remove = screen.getByRole("button", { name: "Remove attachment" });
    expect(remove).toHaveClass("absolute", "top-1", "right-1", "rounded-sm");
    expect(remove).not.toHaveClass("self-start");
  });

  it("renders an <img> thumbnail for local image attachments", () => {
    render(
      <AttachmentChip
        attachment={fileAttachment({
          file: new File(["x"], "pic.png", { type: "image/png" }),
        })}
        onRemove={vi.fn()}
      />,
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "blob:mock");
    expect(img).toHaveAttribute("alt", "pic.png");
  });

  it("renders a server image with its safe sasUrl", () => {
    render(
      <AttachmentChip
        attachment={serverAttachment({
          sasUrl: "https://blob.example/pic.png?sig=abc",
        })}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByRole("img", { name: "pic.png" })).toHaveAttribute(
      "src",
      "https://blob.example/pic.png?sig=abc",
    );
  });

  it("renders a file tile when a server image has no safe sasUrl", () => {
    render(
      <AttachmentChip
        attachment={serverAttachment({ sasUrl: "data:image/png;base64,abc" })}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText("pic.png")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "pic.png" })).toBeNull();
  });

  it("renders a server image as a file tile when remote previews are disabled", () => {
    render(
      <AttachmentChip
        attachment={serverAttachment({
          sasUrl: "https://blob.example/pic.png?sig=abc",
        })}
        onRemove={vi.fn()}
        allowRemotePreview={false}
      />,
    );
    expect(screen.getByText("pic.png")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "pic.png" })).toBeNull();
  });

  it("renders a local image preview when remote previews are disabled", () => {
    render(
      <AttachmentChip
        attachment={fileAttachment({
          file: new File(["x"], "pic.png", { type: "image/png" }),
        })}
        onRemove={vi.fn()}
        allowRemotePreview={false}
      />,
    );
    expect(screen.getByRole("img", { name: "pic.png" })).toHaveAttribute(
      "src",
      "blob:mock",
    );
  });

  it("replaces a local preview with a server preview", () => {
    const { rerender } = render(
      <AttachmentChip
        attachment={fileAttachment({
          file: new File(["x"], "pic.png", { type: "image/png" }),
        })}
        onRemove={vi.fn()}
      />,
    );

    rerender(
      <AttachmentChip
        attachment={serverAttachment({
          sasUrl: "https://blob.example/pic.png?sig=abc",
        })}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByRole("img", { name: "pic.png" })).toHaveAttribute(
      "src",
      "https://blob.example/pic.png?sig=abc",
    );
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");
  });

  it("revokes the object URL on unmount (no blob leak)", () => {
    const { unmount } = render(
      <AttachmentChip
        attachment={fileAttachment({
          file: new File(["x"], "pic.png", { type: "image/png" }),
        })}
        onRemove={vi.fn()}
      />,
    );
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it("revokes every local preview URL after a StrictMode unmount", () => {
    let count = 0;
    const urls: string[] = [];
    vi.mocked(URL.createObjectURL).mockImplementation(() => {
      count += 1;
      const url = `blob:${count}`;
      urls.push(url);
      return url;
    });

    const { unmount } = render(
      <StrictMode>
        <AttachmentChip
          attachment={fileAttachment({
            file: new File(["x"], "pic.png", { type: "image/png" }),
          })}
          onRemove={vi.fn()}
        />
      </StrictMode>,
    );
    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(urls.length);
    for (const url of urls) {
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
    }
  });

  // StrictMode (dev) mounts → unmounts → remounts: the URL the live <img>
  // points at must NOT be one that was revoked, or the thumbnail is broken.
  // Unique-blob tracking catches the split create/revoke bug the shared
  // "blob:mock" mock cannot.
  it("renders a live (non-revoked) object URL under StrictMode", async () => {
    let n = 0;
    const revoked = new Set<string>();
    vi.mocked(URL.createObjectURL).mockImplementation(() => {
      n += 1;
      return `blob:${n}`;
    });
    vi.mocked(URL.revokeObjectURL).mockImplementation((u) =>
      revoked.add(String(u)),
    );
    render(
      <StrictMode>
        <AttachmentChip
          attachment={fileAttachment({
            file: new File(["x"], "pic.png", { type: "image/png" }),
          })}
          onRemove={vi.fn()}
        />
      </StrictMode>,
    );
    const src = (await screen.findByRole("img")).getAttribute("src") ?? "";
    expect(revoked.has(src)).toBe(false);
  });

  it("renders the image thumbnail after the layout effect", () => {
    render(
      <AttachmentChip
        attachment={fileAttachment({
          file: new File(["x"], "pic.png", { type: "image/png" }),
        })}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByRole("img", { name: "pic.png" })).toHaveAttribute(
      "src",
      "blob:mock",
    );
  });

  // The loading affordance is the UPLOAD overlay, driven solely by
  // `status === "uploading"` — local preview generation itself is not loading.
  it("shows no spinner for a ready image", () => {
    render(
      <AttachmentChip
        attachment={fileAttachment({
          file: new File(["x"], "pic.png", { type: "image/png" }),
        })}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("image-tile-loading")).toBeNull();
  });

  it("overlays the upload spinner on the image while uploading", () => {
    render(
      <AttachmentChip
        attachment={fileAttachment({
          file: new File(["x"], "pic.png", { type: "image/png" }),
          status: "uploading",
        })}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByTestId("image-tile-loading")).toBeInTheDocument();
    // The overlay sits over the rendered <img>, not in place of it.
    expect(screen.getByRole("img")).toHaveAttribute("src", "blob:mock");
  });
});
